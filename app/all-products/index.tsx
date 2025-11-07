import { View, Text, StyleSheet } from 'react-native';

export default function AllProductsScreen() {
  return (
    <View style={styles.container}>
      <Text>All Products - Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
