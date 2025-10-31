import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Search, Heart, Award, TrendingUp, Calendar } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const ALL_DONORS = [
  {
    id: '1',
    name: 'Kwame Mensah',
    image: 'https://i.pravatar.cc/150?img=12',
    campaign: 'Build Computer Lab',
    amount: 'GH₵5,000',
    date: '2 hours ago',
    verified: true,
  },
  {
    id: '2',
    name: 'Akosua Frimpong',
    image: 'https://i.pravatar.cc/150?img=45',
    campaign: 'Scholarship Fund',
    amount: 'GH₵2,500',
    date: '5 hours ago',
    verified: true,
  },
  {
    id: '3',
    name: 'Kofi Asante',
    image: 'https://i.pravatar.cc/150?img=33',
    campaign: 'Library Books',
    amount: 'GH₵1,200',
    date: '1 day ago',
    verified: false,
  },
  {
    id: '4',
    name: 'Ama Boateng',
    image: 'https://i.pravatar.cc/150?img=48',
    campaign: 'Teacher Training',
    amount: 'GH₵3,800',
    date: '1 day ago',
    verified: true,
  },
  {
    id: '5',
    name: 'Yaw Agyeman',
    image: 'https://i.pravatar.cc/150?img=56',
    campaign: 'Science Lab Equipment',
    amount: 'GH₵4,500',
    date: '2 days ago',
    verified: true,
  },
  {
    id: '6',
    name: 'Efua Owusu',
    image: 'https://i.pravatar.cc/150?img=38',
    campaign: 'School Meal Program',
    amount: 'GH₵6,200',
    date: '2 days ago',
    verified: true,
  },
  {
    id: '7',
    name: 'Kwesi Adjei',
    image: 'https://i.pravatar.cc/150?img=15',
    campaign: 'Digital Learning Tablets',
    amount: 'GH₵1,800',
    date: '3 days ago',
    verified: false,
  },
  {
    id: '8',
    name: 'Abena Ofori',
    image: 'https://i.pravatar.cc/150?img=44',
    campaign: 'Sports Facility',
    amount: 'GH₵2,100',
    date: '3 days ago',
    verified: false,
  },
  {
    id: '9',
    name: 'Kojo Mensah',
    image: 'https://i.pravatar.cc/150?img=68',
    campaign: 'Build Computer Lab',
    amount: 'GH₵3,500',
    date: '4 days ago',
    verified: true,
  },
  {
    id: '10',
    name: 'Adwoa Sarpong',
    image: 'https://i.pravatar.cc/150?img=29',
    campaign: 'Scholarship Fund',
    amount: 'GH₵5,500',
    date: '4 days ago',
    verified: true,
  },
  {
    id: '11',
    name: 'Fiifi Dadzie',
    image: 'https://i.pravatar.cc/150?img=51',
    campaign: 'Library Books',
    amount: 'GH₵900',
    date: '5 days ago',
    verified: false,
  },
  {
    id: '12',
    name: 'Yaa Osei',
    image: 'https://i.pravatar.cc/150?img=47',
    campaign: 'Teacher Training',
    amount: 'GH₵2,800',
    date: '5 days ago',
    verified: true,
  },
  {
    id: '13',
    name: 'Kwabena Darko',
    image: 'https://i.pravatar.cc/150?img=60',
    campaign: 'Science Lab Equipment',
    amount: 'GH₵4,200',
    date: '6 days ago',
    verified: true,
  },
  {
    id: '14',
    name: 'Serwa Antwi',
    image: 'https://i.pravatar.cc/150?img=32',
    campaign: 'School Meal Program',
    amount: 'GH₵7,500',
    date: '1 week ago',
    verified: true,
  },
  {
    id: '15',
    name: 'Nana Yeboah',
    image: 'https://i.pravatar.cc/150?img=14',
    campaign: 'Digital Learning Tablets',
    amount: 'GH₵1,500',
    date: '1 week ago',
    verified: false,
  },
];

export default function AllDonorsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDonors, setFilteredDonors] = useState(ALL_DONORS);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDonors(ALL_DONORS);
    } else {
      const filtered = ALL_DONORS.filter(donor => 
        donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donor.campaign.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDonors(filtered);
    }
  }, [searchQuery]);

  const totalDonated = filteredDonors.reduce((sum, donor) => {
    const amount = parseFloat(donor.amount.replace(/[^0-9.]/g, ''));
    return sum + amount;
  }, 0);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Recent Donors</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search donors..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Heart size={24} color="#FF6B6B" />
            <Text style={styles.statNumber}>{filteredDonors.length}</Text>
            <Text style={styles.statLabel}>Total Donors</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <TrendingUp size={24} color="#4169E1" />
            <Text style={styles.statNumber}>GH₵{totalDonated.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Donated</Text>
          </View>
        </View>

        <View style={styles.donorsList}>
          {filteredDonors.map((donor, index) => (
            <TouchableOpacity key={donor.id} style={styles.donorCard}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Image source={{ uri: donor.image }} style={styles.donorImage} />
              <View style={styles.donorInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.donorName}>{donor.name}</Text>
                  {donor.verified && (
                    <View style={styles.verifiedBadge}>
                      <Award size={14} color="#4169E1" />
                    </View>
                  )}
                </View>
                <Text style={styles.donorCampaign}>Donated to {donor.campaign}</Text>
                <View style={styles.dateRow}>
                  <Calendar size={12} color="#999999" />
                  <Text style={styles.dateText}>{donor.date}</Text>
                </View>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amountText}>{donor.amount}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredDonors.length === 0 && (
          <View style={styles.emptyState}>
            <Search size={48} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>No donors found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your search</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you to all our generous donors for making education accessible!
          </Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 4,
  },
  donorsList: {
    paddingHorizontal: 16,
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  donorImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  donorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  donorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  verifiedBadge: {
    marginLeft: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 2,
  },
  donorCampaign: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  amountContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2E7D32',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 8,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
