import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Medal, Calendar, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export type House = {
  id: string;
  name: string;
  color: string;
  motto: string;
  image: string;
  housemaster: string;
  students: number;
  achievements: string[];
  events: Array<{
    title: string;
    date: string;
  }>;
};

type HouseCardProps = {
  house: House;
  onPress: () => void;
};

export default function HouseCard({ house, onPress }: HouseCardProps) {
  return (
    <TouchableOpacity style={styles.houseCard} onPress={onPress}>
      <Image source={{ uri: house.image }} style={styles.houseImage} />
      <View style={styles.houseOverlay}>
        <View style={[styles.houseColorBar, { backgroundColor: house.color }]} />
        <View style={styles.houseContent}>
          <View style={styles.houseHeader}>
            <View>
              <Text style={styles.houseName}>{house.name}</Text>
              <Text style={styles.houseMotto}>"{house.motto}"</Text>
            </View>
            <View style={[styles.houseBadge, { backgroundColor: house.color }]}>
              <Text style={styles.houseBadgeText}>{house.students}</Text>
              <Text style={styles.houseBadgeLabel}>Students</Text>
            </View>
          </View>

          <View style={styles.houseMasterInfo}>
            <Text style={styles.houseMasterLabel}>Housemaster</Text>
            <Text style={styles.houseMasterName}>{house.housemaster}</Text>
          </View>

          <View style={styles.achievementsContainer}>
            <Text style={styles.achievementsTitle}>Recent Achievements</Text>
            <View style={styles.achievements}>
              {house.achievements.map((achievement, index) => (
                <View key={index} style={styles.achievementItem}>
                  <Medal size={14} color={house.color} />
                  <Text style={styles.achievementText}>{achievement}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.eventsContainer}>
            <Text style={styles.eventsTitle}>Upcoming Events</Text>
            {house.events.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <Calendar size={14} color="#666666" />
                <Text style={styles.eventText}>{event.title}</Text>
                <Text style={styles.eventDate}>{event.date}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.learnMoreButton, { backgroundColor: house.color }]}
          >
            <Text style={styles.learnMoreText}>Learn More</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  houseCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  houseImage: {
    width: '100%',
    height: 200,
  },
  houseOverlay: {
    backgroundColor: '#FFFFFF',
  },
  houseColorBar: {
    height: 4,
  },
  houseContent: {
    padding: 16,
    gap: 16,
  },
  houseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  houseName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  houseMotto: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    fontStyle: 'italic',
  },
  houseBadge: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  houseBadgeText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  houseBadgeLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  houseMasterInfo: {
    gap: 4,
  },
  houseMasterLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  houseMasterName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  achievementsContainer: {
    gap: 8,
  },
  achievementsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  achievements: {
    gap: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  eventsContainer: {
    gap: 8,
  },
  eventsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  eventDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});