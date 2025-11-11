import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	RefreshControl,
	Share as RNShare,
	Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
	Bookmark,
	Search,
	Bell,
	ArrowRight,
	RefreshCw,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { NEWS_CATEGORIES, BREAKING_NEWS_REFRESH_INTERVAL } from '@/lib/constants/news';
import { NewsArticle, NewsCategory } from '@/lib/types/news';
import { newsService } from '@/lib/services/news-service';
import BreakingNewsBanner from '@/components/news/BreakingNewsBanner';
import CategorySelector from '@/components/news/CategorySelector';
import NewsCard from '@/components/news/NewsCard';
import SkeletonLoader from '@/components/news/SkeletonLoader';

export default function NewsHomeScreen() {
	const router = useRouter();

	// User
	const [userId, setUserId] = useState<string | null>(null);

	// UI state
	const [activeCategory, setActiveCategory] = useState<NewsCategory>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [isSearching, setIsSearching] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// Data
	const [breaking, setBreaking] = useState<NewsArticle[]>([]);
	const [featured, setFeatured] = useState<NewsArticle[]>([]);
	const [latest, setLatest] = useState<NewsArticle[]>([]);
	const [searchResults, setSearchResults] = useState<NewsArticle[]>([]);

	// Loading
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Pagination (client-side slice)
	const [visibleCount, setVisibleCount] = useState(10);

	// Init: user and first load
	useEffect(() => {
		const init = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			setUserId(user?.id || null);
			await loadAll(activeCategory);
			// Warm breaking cache
			startBreakingTicker();
		};
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Reload when category changes
	useEffect(() => {
		loadAll(activeCategory);
		// Reset list size on category switch
		setVisibleCount(10);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeCategory]);

	// Periodically refresh breaking banner
		const breakingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startBreakingTicker = () => {
		if (breakingTimerRef.current) return;
		breakingTimerRef.current = setInterval(async () => {
			try {
				const b = await newsService.fetchBreakingNews();
				setBreaking(b);
			} catch {}
		}, BREAKING_NEWS_REFRESH_INTERVAL);
	};
	useEffect(() => {
		return () => {
			if (breakingTimerRef.current) clearInterval(breakingTimerRef.current);
		};
	}, []);

	const loadAll = async (category: NewsCategory) => {
		try {
			setLoading(true);
			setError(null);

			const [b, byCat, trending] = await Promise.all([
				newsService.fetchBreakingNews(),
				newsService.fetchByCategory(category),
				newsService.fetchTrendingNews(),
			]);

			setBreaking(b);
			// Featured: top 5 trending or top of category
			setFeatured((trending && trending.length ? trending : byCat).slice(0, 5));
			// Latest: category feed
			setLatest(byCat);
		} catch (e: any) {
			setError('Failed to load news. Pull to retry.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await Promise.all([
			newsService.clearCache(),
			loadAll(activeCategory),
		]);
	}, [activeCategory]);

	// Search
	useEffect(() => {
		const delay = setTimeout(async () => {
			if (searchQuery.trim().length === 0) {
				setIsSearching(false);
				setSearchResults([]);
				return;
			}
			setIsSearching(true);
			try {
				const results = await newsService.searchNews(searchQuery, activeCategory);
				setSearchResults(results);
			} catch {
				setSearchResults([]);
			} finally {
				setIsSearching(false);
			}
		}, 350);
		return () => clearTimeout(delay);
	}, [searchQuery, activeCategory]);

	const handleArticlePress = (article: NewsArticle) => {
		router.push({ pathname: '/news/article-detail', params: { articleData: JSON.stringify(article) } });
	};

	const handleBookmarkToggle = async (article: NewsArticle) => {
		if (!userId) {
			return;
		}
		try {
			// Try to delete first (idempotent UX)
			await supabase
				.from('news_bookmarks')
				.delete()
				.eq('user_id', userId)
				.eq('article_id', article.id);

			// Re-insert to toggle on
			await supabase.from('news_bookmarks').insert({
				user_id: userId,
				article_id: article.id,
				article_data: article,
			});
		} catch (err) {
			// If insert fails due to constraint, we already had it; remove as toggle off
			try {
				await supabase
					.from('news_bookmarks')
					.delete()
					.eq('user_id', userId)
					.eq('article_id', article.id);
			} catch {}
		}
	};

	const handleShare = async (article: NewsArticle) => {
		try {
			await RNShare.share({
				title: article.title,
				message: `${article.title}\n\n${article.description}\n\nRead more: ${article.url}`,
				url: article.url,
			});
		} catch {}
	};

	const loadMore = () => {
		if (loadingMore || loading) return;
		if (visibleCount >= latest.length) return;
		setLoadingMore(true);
		setTimeout(() => {
			setVisibleCount((c) => Math.min(c + 10, latest.length));
			setLoadingMore(false);
		}, 300);
	};

	const visibleLatest = useMemo(() => latest.slice(0, visibleCount), [latest, visibleCount]);

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>News</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity onPress={() => router.push('/news/outlets')} style={styles.iconButton}>
						<Text style={{ fontWeight: '700', color: '#007AFF' }}>Outlets</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => router.push('/news/bookmarks')} style={styles.iconButton}>
						<Bookmark size={22} color="#000" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Search */}
			<View style={styles.searchBar}>
				<Search size={18} color="#8E8E93" />
				<TextInput
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Search global news…"
					placeholderTextColor="#8E8E93"
					style={styles.searchInput}
					returnKeyType="search"
					onSubmitEditing={() => Keyboard.dismiss()}
				/>
				{!!searchQuery && (
					<TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
						<Text style={styles.clearText}>Clear</Text>
					</TouchableOpacity>
				)}
			</View>

			<ScrollView
				style={styles.scroll}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				onScrollEndDrag={loadMore}
			>
				{/* Breaking Banner */}
				{!loading && breaking.length > 0 && (
					<BreakingNewsBanner
						articles={breaking}
						onArticlePress={handleArticlePress}
					/>
				)}

				{/* Categories */}
				<CategorySelector
					categories={NEWS_CATEGORIES}
					activeCategory={activeCategory}
					onCategoryChange={(c) => setActiveCategory(c as NewsCategory)}
				/>

				{/* Loading state */}
				{loading ? (
					<View style={{ paddingHorizontal: 16 }}>
						<SkeletonLoader variant="featured" count={1} />
						<SkeletonLoader variant="horizontal" count={5} />
					</View>
				) : (
					<>
						{/* Featured carousel */}
						{featured.length > 0 && (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.featuredRow}
							>
								{featured.map((a) => (
									<View key={a.id} style={{ marginLeft: 16 }}>
										<NewsCard
											article={a}
											variant="featured"
											onPress={() => handleArticlePress(a)}
											onShare={() => handleShare(a)}
											onBookmark={() => handleBookmarkToggle(a)}
										/>
									</View>
								))}
							</ScrollView>
						)}

						{/* Section header */}
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Latest</Text>
							<TouchableOpacity onPress={() => router.push('/news/see-all')} style={styles.seeAllButton}>
								<Text style={styles.seeAllText}>See all</Text>
								<ArrowRight size={16} color="#8E8E93" />
							</TouchableOpacity>
						</View>

						{/* Search results */}
						{searchQuery.trim().length > 0 ? (
							<View style={styles.list}>
								{isSearching ? (
									<SkeletonLoader variant="horizontal" count={6} />
								) : searchResults.length === 0 ? (
									<Text style={styles.emptyText}>No results for “{searchQuery}”.</Text>
								) : (
									searchResults.map((a) => (
										<View key={a.id} style={{ marginBottom: 12 }}>
											<NewsCard
												article={a}
												variant="horizontal"
												onPress={() => handleArticlePress(a)}
												onShare={() => handleShare(a)}
												onBookmark={() => handleBookmarkToggle(a)}
											/>
										</View>
									))
								)}
							</View>
						) : (
							<View style={styles.list}>
								{visibleLatest.map((a) => (
									<View key={a.id} style={{ marginBottom: 12 }}>
										<NewsCard
											article={a}
											variant="horizontal"
											onPress={() => handleArticlePress(a)}
											onShare={() => handleShare(a)}
											onBookmark={() => handleBookmarkToggle(a)}
										/>
									</View>
								))}

								{visibleCount < latest.length && (
									<View style={styles.loadMoreRow}>
										<RefreshCw size={16} color="#8E8E93" />
										<Text style={styles.loadMoreText}>Scroll to load more…</Text>
									</View>
								)}
							</View>
						)}
					</>
				)}

				{!!error && (
					<Text style={styles.errorText}>{error}</Text>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		paddingTop: 60,
		paddingBottom: 12,
		paddingHorizontal: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#F2F2F7',
	},
	title: {
		fontSize: 30,
		fontWeight: '800',
		color: '#000',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	iconButton: {
		padding: 8,
		borderRadius: 20,
	},
	searchBar: {
		marginTop: 12,
		marginHorizontal: 16,
		marginBottom: 8,
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderRadius: 12,
		backgroundColor: '#F2F2F7',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#000',
	},
	clearButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	clearText: {
		color: '#8E8E93',
		fontSize: 13,
	},
	scroll: {
		flex: 1,
	},
	featuredRow: {
		paddingRight: 16,
	},
	sectionHeader: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#000',
	},
	seeAllButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	seeAllText: {
		color: '#8E8E93',
		fontWeight: '600',
	},
	list: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	loadMoreRow: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		justifyContent: 'center',
	},
	loadMoreText: {
		color: '#8E8E93',
		fontSize: 12,
	},
	emptyText: {
		color: '#8E8E93',
	},
	errorText: {
		color: '#FF3B30',
		textAlign: 'center',
		marginTop: 12,
	},
});

