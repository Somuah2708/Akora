import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Animated,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  X,
  Check,
  RotateCw,
  Crop,
  Scissors,
  VolumeX,
  Volume2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Conditionally import FFmpegKit
let FFmpegKit: any = null;
let FFmpegKitConfig: any = null;
let FFprobeKit: any = null;
try {
  const ffmpegModule = require('ffmpeg-kit-react-native');
  FFmpegKit = ffmpegModule.FFmpegKit;
  FFmpegKitConfig = ffmpegModule.FFmpegKitConfig;
  FFprobeKit = ffmpegModule.FFprobeKit;
} catch (e) {
  console.warn('FFmpegKit not available - video editing limited in Expo Go');
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type MediaType = 'image' | 'video';

type EditedMediaResult = {
  uri: string;
  type: MediaType;
  trimStart?: number;
  trimEnd?: number;
  muted?: boolean;
  originalDuration?: number;
  requiresServerProcessing?: boolean; // when FFmpeg isn't available, fallback to server
};

type Props = {
  visible: boolean;
  uri: string;
  type: MediaType;
  onClose: () => void;
  onDone: (result: EditedMediaResult) => void;
};

type EditMode = 'none' | 'crop' | 'trim';

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD93D'];

export default function MediaEditorModal({ visible, uri, type, onClose, onDone }: Props) {
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [working, setWorking] = useState(false);
  const [currentUri, setCurrentUri] = useState(uri);

  // Image editing states
  const [rotation, setRotation] = useState(0);
  const [cropMode, setCropMode] = useState(false);

  // Video editing states
  const [trimMode, setTrimMode] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const videoRef = useRef<Video>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  
  // iOS-style trim handles
  const trimStartHandle = useRef(new Animated.Value(0)).current;
  const trimEndHandle = useRef(new Animated.Value(0)).current;
  const [timelineWidth, setTimelineWidth] = useState(SCREEN_WIDTH - 40);
  const getSnapIncrement = () => {
    if (videoDuration <= 30) return 0.05;
    if (videoDuration <= 120) return 0.1;
    return 0.25;
  };
  const thumbnailsGeneratedRef = useRef(false);
  const seekingRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const durationInitializedRef = useRef(false);

  const processSeek = useCallback(async () => {
    if (seekingRef.current) return;
    if (pendingSeekRef.current === null) return;
    const target = pendingSeekRef.current;
    pendingSeekRef.current = null;
    seekingRef.current = true;
    try {
      await videoRef.current?.setPositionAsync(Math.max(target, 0) * 1000);
    } catch (err) {
      console.warn('Video seek failed', err);
    } finally {
      seekingRef.current = false;
      if (pendingSeekRef.current !== null) {
        processSeek();
      }
    }
  }, [videoRef]);

  const requestSeek = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    pendingSeekRef.current = seconds;
    processSeek();
  }, [processSeek, videoRef]);

  // Crop handles with draggable feature
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const [cropRegion, setCropRegion] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const cropLeft = useRef(new Animated.Value(0)).current;
  const cropTop = useRef(new Animated.Value(0)).current;
  const cropWidth = useRef(new Animated.Value(0)).current;
  const cropHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCurrentUri(uri);
      setRotation(0);
      setEditMode('none');
      setCropMode(false);
      setVideoDuration(0);
      setTrimStart(0);
      setTrimEnd(0);
      setThumbnails([]);
      thumbnailsGeneratedRef.current = false;
      durationInitializedRef.current = false;
      pendingSeekRef.current = null;
      seekingRef.current = false;

      if (type === 'video') {
        // wait for playback status to provide duration before generating thumbnails
      } else {
        loadImageDimensions();
      }
    }
  }, [visible, uri]);

  const loadImageDimensions = () => {
    Image.getSize(
      uri,
      (width, height) => {
        setImageDimensions({ width, height });
        
        // Calculate display size to fit screen
        const maxWidth = SCREEN_WIDTH - 40;
        const maxHeight = SCREEN_HEIGHT * 0.6;
        let displayWidth = maxWidth;
        let displayHeight = (height / width) * maxWidth;
        
        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = (width / height) * maxHeight;
        }
        
        setDisplayDimensions({ width: displayWidth, height: displayHeight });
        
        // Initialize crop region to full image with 10% margins
        const margin = displayWidth * 0.1;
        const initialCrop = {
          x: margin,
          y: margin,
          width: displayWidth - (margin * 2),
          height: displayHeight - (margin * 2),
        };
        setCropRegion(initialCrop);
        cropLeft.setValue(initialCrop.x);
        cropTop.setValue(initialCrop.y);
        cropWidth.setValue(initialCrop.width);
        cropHeight.setValue(initialCrop.height);
      },
      (error) => console.error('Failed to get image size:', error)
    );
  };

  const generateVideoThumbnails = async (duration: number) => {
    try {
      if (!duration || duration <= 0) return;
      if (thumbnailsGeneratedRef.current) return;
      thumbnailsGeneratedRef.current = true;
      setTrimEnd(duration);

      const thumbs: string[] = [];
      const numThumbs = 8;
      for (let i = 0; i < numThumbs; i++) {
        const time = Math.min(duration, (duration / numThumbs) * i); // seconds (float)
        const ms = Math.max(0, Math.floor(time * 1000)); // integer milliseconds required by API
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: ms });
        thumbs.push(thumbUri);
      }
      setThumbnails(thumbs);
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
      // Fallback
      setVideoDuration((prev) => (prev > 0 ? prev : 10));
      setTrimEnd((prev) => (prev > 0 ? prev : 10));
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCropToggle = () => {
    const newCropMode = !cropMode;
    setCropMode(newCropMode);
    setEditMode(newCropMode ? 'crop' : 'none');
    
    if (newCropMode) {
      // Reset crop to full image when entering crop mode
      loadImageDimensions();
    }
  };

  // Pan responders for draggable crop handles
  const createPanResponder = (handle: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'top' | 'bottom' | 'left' | 'right') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const { dx, dy } = gesture;
        const newRegion = { ...cropRegion };
        
        switch (handle) {
          case 'topLeft':
            newRegion.x = Math.max(0, Math.min(cropRegion.x + dx, cropRegion.x + cropRegion.width - 50));
            newRegion.y = Math.max(0, Math.min(cropRegion.y + dy, cropRegion.y + cropRegion.height - 50));
            newRegion.width = cropRegion.width - dx;
            newRegion.height = cropRegion.height - dy;
            break;
          case 'topRight':
            newRegion.y = Math.max(0, Math.min(cropRegion.y + dy, cropRegion.y + cropRegion.height - 50));
            newRegion.width = Math.max(50, Math.min(displayDimensions.width - cropRegion.x, cropRegion.width + dx));
            newRegion.height = cropRegion.height - dy;
            break;
          case 'bottomLeft':
            newRegion.x = Math.max(0, Math.min(cropRegion.x + dx, cropRegion.x + cropRegion.width - 50));
            newRegion.width = cropRegion.width - dx;
            newRegion.height = Math.max(50, Math.min(displayDimensions.height - cropRegion.y, cropRegion.height + dy));
            break;
          case 'bottomRight':
            newRegion.width = Math.max(50, Math.min(displayDimensions.width - cropRegion.x, cropRegion.width + dx));
            newRegion.height = Math.max(50, Math.min(displayDimensions.height - cropRegion.y, cropRegion.height + dy));
            break;
          case 'top':
            newRegion.y = Math.max(0, Math.min(cropRegion.y + dy, cropRegion.y + cropRegion.height - 50));
            newRegion.height = cropRegion.height - dy;
            break;
          case 'bottom':
            newRegion.height = Math.max(50, Math.min(displayDimensions.height - cropRegion.y, cropRegion.height + dy));
            break;
          case 'left':
            newRegion.x = Math.max(0, Math.min(cropRegion.x + dx, cropRegion.x + cropRegion.width - 50));
            newRegion.width = cropRegion.width - dx;
            break;
          case 'right':
            newRegion.width = Math.max(50, Math.min(displayDimensions.width - cropRegion.x, cropRegion.width + dx));
            break;
        }
        
        setCropRegion(newRegion);
        cropLeft.setValue(newRegion.x);
        cropTop.setValue(newRegion.y);
        cropWidth.setValue(newRegion.width);
        cropHeight.setValue(newRegion.height);
      },
    });
  };

  const topLeftPan = createPanResponder('topLeft');
  const topRightPan = createPanResponder('topRight');
  const bottomLeftPan = createPanResponder('bottomLeft');
  const bottomRightPan = createPanResponder('bottomRight');
  const topPan = createPanResponder('top');
  const bottomPan = createPanResponder('bottom');
  const leftPan = createPanResponder('left');
  const rightPan = createPanResponder('right');

  const handleTrimToggle = () => {
    setTrimMode(!trimMode);
    setEditMode(trimMode ? 'none' : 'trim');
    if (!trimMode && videoDuration > 0) {
      // Initialize trim to full video
      setTrimStart(0);
      setTrimEnd(videoDuration);
      trimStartHandle.setValue(0);
      trimEndHandle.setValue(timelineWidth);
    }
  };

  // iOS-style trim handle pan responders
  const createTrimPanResponder = (isStart: boolean) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setDraggingHandle(isStart ? 'start' : 'end'),
      onPanResponderMove: (_, gesture) => {
        if (videoDuration <= 0) return;
        const handle = isStart ? trimStartHandle : trimEndHandle;
        const currentValue = isStart ? trimStart : trimEnd;
        
        // Calculate new position from current value + gesture
        let newX = (currentValue / videoDuration) * timelineWidth + gesture.dx;
        
        // Constrain within bounds
        newX = Math.max(0, Math.min(timelineWidth, newX));
        
        // Prevent handles crossing; use ~0.3s minimum span to feel like iOS
        const minSpan = 0.3;
        if (isStart) {
          const maxX = ((trimEnd - minSpan) / videoDuration) * timelineWidth;
          newX = Math.min(newX, maxX);
        } else {
          const minX = ((trimStart + minSpan) / videoDuration) * timelineWidth;
          newX = Math.max(newX, minX);
        }
        
        // Convert to time and snap to increment
        let newTime = (newX / timelineWidth) * videoDuration;
        const inc = getSnapIncrement();
        newTime = Math.max(0, Math.min(videoDuration, Math.round(newTime / inc) * inc));
        
        // Update animated value to snapped position
        const snappedX = (newTime / videoDuration) * timelineWidth;
        handle.setValue(snappedX);
        
        // Update state
        if (isStart) setTrimStart(newTime); else setTrimEnd(newTime);
      },
      onPanResponderRelease: () => setDraggingHandle(null),
      onPanResponderTerminate: () => setDraggingHandle(null),
    });
  };

  const trimStartPan = createTrimPanResponder(true);
  const trimEndPan = createTrimPanResponder(false);

  // Sync handle positions when timeline size or video duration changes
  useEffect(() => {
    if (videoDuration > 0 && timelineWidth > 0) {
      const startX = (trimStart / Math.max(1, videoDuration)) * timelineWidth;
      const endX = (trimEnd / Math.max(1, videoDuration)) * timelineWidth;
      trimStartHandle.setValue(startX);
      trimEndHandle.setValue(endX);
    }
  }, [videoDuration, timelineWidth]);

  // Update handles when trim values change (from buttons or programmatically)
  useEffect(() => {
    if (videoDuration > 0 && timelineWidth > 0) {
      const x = (trimStart / videoDuration) * timelineWidth;
      trimStartHandle.setValue(x);
    }
    if (typeof trimStart === 'number') {
      requestSeek(trimStart);
    }
  }, [trimStart, videoDuration, timelineWidth, requestSeek]);

  useEffect(() => {
    if (videoDuration > 0 && timelineWidth > 0) {
      const x = (trimEnd / videoDuration) * timelineWidth;
      trimEndHandle.setValue(x);
    }
  }, [trimEnd]);

  // Monitor playback and enforce trimmed loop range when trim mode is active
  const handlePlaybackStatus = (status: any) => {
    if (!status || !status.isLoaded) return;
    if (status.durationMillis) {
      const duration = status.durationMillis / 1000;
      if (!durationInitializedRef.current) {
        durationInitializedRef.current = true;
        setVideoDuration(duration);
        setTrimEnd(duration);
        requestSeek(trimStart);
        generateVideoThumbnails(duration);
      }
    }

    if (trimMode && trimEnd > trimStart) {
      const pos = status.positionMillis / 1000;
      if (pos > trimEnd + 0.02) {
        requestSeek(trimStart);
      }
    }
  };

  const applyImageEdits = async () => {
    try {
      setWorking(true);
      let editedUri = currentUri;

      // Apply rotation first if needed
      if (rotation !== 0) {
        const actions: any[] = [];
        if (rotation === 90) actions.push({ rotate: 90 });
        else if (rotation === 180) actions.push({ rotate: 180 });
        else if (rotation === 270) actions.push({ rotate: 270 });

        const result = await ImageManipulator.manipulateAsync(editedUri, actions, {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        editedUri = result.uri;
      }

      // Apply crop if in crop mode
      if (cropMode && imageDimensions.width > 0 && displayDimensions.width > 0) {
        // Calculate scale from display to actual image
        const scaleX = imageDimensions.width / displayDimensions.width;
        const scaleY = imageDimensions.height / displayDimensions.height;
        
        const cropAction: any = {
          crop: {
            originX: Math.max(0, Math.floor(cropRegion.x * scaleX)),
            originY: Math.max(0, Math.floor(cropRegion.y * scaleY)),
            width: Math.min(imageDimensions.width, Math.floor(cropRegion.width * scaleX)),
            height: Math.min(imageDimensions.height, Math.floor(cropRegion.height * scaleY)),
          },
        };

        const result = await ImageManipulator.manipulateAsync(editedUri, [cropAction], {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        editedUri = result.uri;
      }

  onDone({ uri: editedUri, type: 'image' });
    } catch (error: any) {
      console.error('Failed to apply image edits:', error);
      Alert.alert('Error', 'Failed to apply edits. Using original image.');
  onDone({ uri: currentUri, type: 'image' });
    } finally {
      setWorking(false);
    }
  };

  const applyVideoEdits = async () => {
    if (!FFmpegKit) {
      // No dev build: return metadata so upload flow can perform server-side processing
      onDone({ uri, type: 'video', trimStart, trimEnd, muted: videoMuted, originalDuration: videoDuration, requiresServerProcessing: true });
      return;
    }

    try {
      setWorking(true);
      const outputPath = `${FFmpegKitConfig.getSafParameter(Date.now().toString())}-edited.mp4`;

      const trimming = trimMode && trimEnd > trimStart && (trimEnd - trimStart) < videoDuration;
      const needsReencode = videoMuted || trimming; // rotation for video not implemented yet
      const durationSpan = trimming ? (trimEnd - trimStart) : videoDuration;

      // Build command – accurate trim pattern: place -ss after -i for precise seeking
      let command = '';
      command += `-i "${uri}"`;
      if (trimming) {
        command += ` -ss ${trimStart} -t ${durationSpan}`;
      }

      const needsAudio = !videoMuted;
      const reencodeVideo = true; // trimming precision requires decode/re-encode for consistent results

      if (videoMuted) command += ' -an';
      if (reencodeVideo) {
        command += ' -vf "scale=iw:ih" -c:v libx264 -preset veryfast -crf 23 -movflags +faststart';
        if (needsAudio) command += ' -c:a aac -b:a 128k';
      } else {
        command += ' -c:v copy';
        if (needsAudio) command += ' -c:a copy';
      }

      command += ` "${outputPath}"`;

      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (returnCode.isValueSuccess()) {
        // Optional validation with FFprobe
        if (FFprobeKit) {
          try {
            const probeSession = await FFprobeKit.getMediaInformation(outputPath);
            const info = probeSession.getMediaInformation();
            const outDuration = info?.getDuration() ? parseFloat(info.getDuration()) : undefined;
            console.log('Exported video duration (probe):', outDuration);
          } catch (probeErr) {
            console.warn('FFprobe validation failed:', probeErr);
          }
        }
        onDone({ uri: outputPath, type: 'video', trimStart, trimEnd, muted: videoMuted, originalDuration: videoDuration });
      } else {
        throw new Error('FFmpeg processing failed');
      }
    } catch (error: any) {
      console.error('Failed to apply video edits:', error);
      Alert.alert('Error', 'Failed to apply video edits. Using original video.');
      onDone({ uri, type: 'video', trimStart, trimEnd, muted: videoMuted, originalDuration: videoDuration });
    } finally {
      setWorking(false);
    }
  };

  const handleDone = () => {
    if (type === 'image') {
      applyImageEdits();
    } else {
      applyVideoEdits();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {/* Top Bar */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.topBar}
        >
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDone}
            style={[styles.doneButton, working && styles.doneButtonDisabled]}
            disabled={working}
          >
            {working ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Check size={28} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* Media Display */}
        <View style={styles.mediaContainer}>
          {type === 'image' ? (
            <Image
              source={{ uri: currentUri }}
              style={[
                styles.mediaPreview,
                { 
                  transform: [{ rotate: `${rotation}deg` }],
                  width: displayDimensions.width,
                  height: displayDimensions.height,
                },
              ]}
              resizeMode="contain"
            />
          ) : (
            <Video
              ref={videoRef}
              source={{ uri: currentUri }}
              style={styles.mediaPreview}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              isMuted={videoMuted}
              onPlaybackStatusUpdate={handlePlaybackStatus}
            />
          )}

          {/* Crop Overlay with Draggable Handles */}
          {cropMode && type === 'image' && (
            <View style={[styles.cropOverlay, { width: displayDimensions.width, height: displayDimensions.height }]}>
              {/* Darkened areas outside crop region */}
              <View style={[styles.cropDarkOverlay, { height: cropRegion.y }]} />
              <View style={{ flexDirection: 'row', height: cropRegion.height }}>
                <View style={[styles.cropDarkOverlay, { width: cropRegion.x }]} />
                <View style={{ width: cropRegion.width, height: cropRegion.height }} />
                <View style={[styles.cropDarkOverlay, { flex: 1 }]} />
              </View>
              <View style={[styles.cropDarkOverlay, { flex: 1 }]} />
              
              {/* Crop Region Border */}
              <Animated.View
                style={[
                  styles.cropRegion,
                  {
                    left: cropLeft,
                    top: cropTop,
                    width: cropWidth,
                    height: cropHeight,
                  },
                ]}
              >
                {/* Corner Handles */}
                <Animated.View
                  {...topLeftPan.panHandlers}
                  style={[styles.cropHandle, styles.cropHandleTopLeft]}
                />
                <Animated.View
                  {...topRightPan.panHandlers}
                  style={[styles.cropHandle, styles.cropHandleTopRight]}
                />
                <Animated.View
                  {...bottomLeftPan.panHandlers}
                  style={[styles.cropHandle, styles.cropHandleBottomLeft]}
                />
                <Animated.View
                  {...bottomRightPan.panHandlers}
                  style={[styles.cropHandle, styles.cropHandleBottomRight]}
                />
                
                {/* Edge Handles */}
                <Animated.View
                  {...topPan.panHandlers}
                  style={[styles.cropEdgeHandle, styles.cropEdgeHandleTop]}
                />
                <Animated.View
                  {...bottomPan.panHandlers}
                  style={[styles.cropEdgeHandle, styles.cropEdgeHandleBottom]}
                />
                <Animated.View
                  {...leftPan.panHandlers}
                  style={[styles.cropEdgeHandle, styles.cropEdgeHandleLeft]}
                />
                <Animated.View
                  {...rightPan.panHandlers}
                  style={[styles.cropEdgeHandle, styles.cropEdgeHandleRight]}
                />
                
                {/* Grid lines */}
                <View style={styles.cropGrid}>
                  <View style={[styles.gridLine, { left: '33%' }]} />
                  <View style={[styles.gridLine, { left: '66%' }]} />
                  <View style={[styles.gridLine, { top: '33%', width: '100%', height: 1 }]} />
                  <View style={[styles.gridLine, { top: '66%', width: '100%', height: 1 }]} />
                </View>
              </Animated.View>
            </View>
          )}
        </View>

        {/* Editing Tools */}
        {!trimMode && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.toolBar}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toolsContent}
            >
              {type === 'image' ? (
                <>
                  <ToolButton
                    icon={<Crop size={24} color="#FFFFFF" />}
                    label="Crop"
                    onPress={handleCropToggle}
                    active={cropMode}
                  />
                  <ToolButton
                    icon={<RotateCw size={24} color="#FFFFFF" />}
                    label="Rotate"
                    onPress={handleRotate}
                  />
                </>
              ) : (
                <>
                  <ToolButton
                    icon={<Scissors size={24} color="#FFFFFF" />}
                    label="Trim"
                    onPress={handleTrimToggle}
                    active={trimMode}
                  />
                  <ToolButton
                    icon={videoMuted ? <VolumeX size={24} color="#FFFFFF" /> : <Volume2 size={24} color="#FFFFFF" />}
                    label={videoMuted ? 'Unmute' : 'Mute'}
                    onPress={() => setVideoMuted(!videoMuted)}
                  />
                </>
              )}
            </ScrollView>
          </LinearGradient>
        )}

        {/* Video Trim Panel */}
        {trimMode && type === 'video' && (
          <View style={styles.trimPanel}>
            <Text style={styles.trimTitle}>Trim Video</Text>

            {/* Thumbnails row */}
            <View style={styles.thumbnailWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll} contentContainerStyle={{ width: timelineWidth }}>
                {thumbnails.map((thumb, index) => (
                  <Image key={index} source={{ uri: thumb }} style={[styles.thumbnail, { width: timelineWidth / Math.max(1, thumbnails.length) }]} />
                ))}
              </ScrollView>

              {/* Timeline with draggable handles */}
              <View
                style={styles.timelineContainer}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  setTimelineWidth(w);
                }}
              >
                {/* Dark overlays left/right and selected area */}
                <Animated.View style={[styles.timelineOverlayLeft, { width: trimStartHandle }]} pointerEvents="none" />
                <Animated.View
                  style={[
                    styles.timelineSelected,
                    {
                      left: trimStartHandle,
                      width: Animated.subtract(trimEndHandle, trimStartHandle),
                    },
                  ]}
                  pointerEvents="none"
                />
                <Animated.View style={[styles.timelineOverlayRight, { left: trimEndHandle, right: 0 }]} pointerEvents="none" />

                {/* Start handle */}
                <Animated.View
                  {...trimStartPan.panHandlers}
                  style={[styles.handle, { left: Animated.add(trimStartHandle, new Animated.Value(-12)) }]}
                >
                  <View style={styles.handleInner} />
                  {draggingHandle === 'start' && (
                    <View style={[styles.timeBadge, styles.timeBadgeLeft]}>
                      <Text style={styles.timeBadgeText}>{trimStart.toFixed(2)}s</Text>
                    </View>
                  )}
                </Animated.View>

                {/* End handle */}
                <Animated.View
                  {...trimEndPan.panHandlers}
                  style={[styles.handle, { left: Animated.add(trimEndHandle, new Animated.Value(-12)) }]}
                >
                  <View style={styles.handleInner} />
                  {draggingHandle === 'end' && (
                    <View style={[styles.timeBadge, styles.timeBadgeRight]}>
                      <Text style={styles.timeBadgeText}>{trimEnd.toFixed(2)}s</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>

            <View style={styles.trimControls}>
              <View style={styles.trimRow}>
                <Text style={styles.trimLabel}>Start: {trimStart.toFixed(1)}s</Text>
                <View style={styles.trimButtons}>
                  <TouchableOpacity
                    style={styles.trimButton}
                    onPress={() => setTrimStart(Math.max(0, Math.max(0, trimStart - 0.5)))}
                  >
                    <Text style={styles.trimButtonText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.trimButton}
                    onPress={() => setTrimStart(Math.min(trimEnd - 0.5, trimStart + 0.5))}
                  >
                    <Text style={styles.trimButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.trimRow}>
                <Text style={styles.trimLabel}>End: {trimEnd.toFixed(1)}s</Text>
                <View style={styles.trimButtons}>
                  <TouchableOpacity
                    style={styles.trimButton}
                    onPress={() => setTrimEnd(Math.max(trimStart + 0.5, trimEnd - 0.5))}
                  >
                    <Text style={styles.trimButtonText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.trimButton}
                    onPress={() => setTrimEnd(Math.min(videoDuration, trimEnd + 0.5))}
                  >
                    <Text style={styles.trimButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const ToolButton = ({
  icon,
  label,
  onPress,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.toolButton, active && styles.toolButtonActive]}
    onPress={onPress}
  >
    {icon}
    <Text style={styles.toolLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconButton: {
    padding: 8,
  },
  doneButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  cropOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropDarkOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cropRegion: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cropGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    width: 1,
    height: '100%',
  },
  cropHandle: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#0A84FF',
  },
  cropHandleTopLeft: {
    top: -15,
    left: -15,
  },
  cropHandleTopRight: {
    top: -15,
    right: -15,
  },
  cropHandleBottomLeft: {
    bottom: -15,
    left: -15,
  },
  cropHandleBottomRight: {
    bottom: -15,
    right: -15,
  },
  cropEdgeHandle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  cropEdgeHandleTop: {
    top: -4,
    left: '25%',
    right: '25%',
    height: 8,
    borderRadius: 4,
  },
  cropEdgeHandleBottom: {
    bottom: -4,
    left: '25%',
    right: '25%',
    height: 8,
    borderRadius: 4,
  },
  cropEdgeHandleLeft: {
    left: -4,
    top: '25%',
    bottom: '25%',
    width: 8,
    borderRadius: 4,
  },
  cropEdgeHandleRight: {
    right: -4,
    top: '25%',
    bottom: '25%',
    width: 8,
    borderRadius: 4,
  },
  toolBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
  },
  toolsContent: {
    paddingHorizontal: 20,
    gap: 15,
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 70,
  },
  toolButtonActive: {
    backgroundColor: '#0A84FF',
  },
  toolLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  trimPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  trimTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  thumbnailScroll: {
    marginBottom: 20,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#1E293B',
  },
  trimControls: {
    gap: 15,
  },
  trimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trimLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trimButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  trimButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  timelineContainer: {
    height: 44,
    marginTop: 8,
    alignSelf: 'stretch',
    position: 'relative',
    justifyContent: 'center',
  },
  timelineOverlayLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  timelineOverlayRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  timelineSelected: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,132,255,0.12)',
    borderColor: '#0A84FF',
    borderWidth: 1,
  },
  handle: {
    position: 'absolute',
    top: -6,
    width: 24,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  handleInner: {
    width: 6,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  timeBadge: {
    position: 'absolute',
    top: -30,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
  },
  timeBadgeLeft: {
    left: -10,
  },
  timeBadgeRight: {
    right: -10,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
