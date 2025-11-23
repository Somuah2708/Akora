# Dynamic Locations System Setup Guide


## Overview
This system allows users to dynamically add new regions and cities when posting items, exactly like Tonaton and Jiji. The system automatically tracks item counts per location and makes new locations available for all users.

## Features Implemented

### 1. **Database Structure**
- `regions` table: Stores all regions in Ghana
- `cities` table: Stores cities/districts linked to regions
- Automatic item counting per location
- Row Level Security (RLS) for data protection

### 2. **User Features**
- **Browse locations**: Users can filter by region and city
- **Item counts displayed**: Shows number of items in each location (e.g., "Greater Accra (24)")
- **Add new locations**: If a user's location isn't listed, they can add it
- **Horizontal scrollable location lists**: Clean, professional UI
- **Cascading selection**: Select region first, then city

### 3. **How It Works**
1. User clicks the filter button
2. Selects location or clicks "Add New"
3. Enters region and city name
4. New location is saved to database
5. Location becomes available for all users immediately
6. Item counts update automatically

## Setup Instructions

### Step 1: Run the SQL Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the entire content from `CREATE_LOCATIONS_SYSTEM.sql`
5. Click **Run** to execute

The migration will:
- Create `regions` and `cities` tables
- Add location fields to `products_services` table
- Insert default Ghana regions and major cities
- Create the `add_new_location()` function
- Set up Row Level Security policies
- Create helper functions and views

### Step 2: Verify the Migration

Run these verification queries in SQL Editor:

```sql
-- Check regions
SELECT * FROM regions ORDER BY name;

-- Check cities
SELECT r.name as region, c.name as city 
FROM cities c 
JOIN regions r ON r.id = c.region_id 
ORDER BY r.name, c.name;

-- Check location counts (will be 0 initially)
SELECT * FROM get_location_stats();
```

### Step 3: Test the System

1. Open your app and navigate to the Marketplace
2. Click the filter button
3. You should see all regions loaded from the database
4. Select a region to see its cities
5. Try adding a new location:
   - Click "Add New" button
   - Enter region name (e.g., "Greater Accra")
   - Enter city name (e.g., "Tesano")
   - Submit
6. The new location should appear immediately in the filter

## How Users Add New Locations

### In the App:

1. **Click Filter Button** → Opens comprehensive filter modal
2. **Look for Location Section** → Shows all available regions
3. **Click "Add New" Button** → Opens add location modal
4. **Enter Details**:
   - Region: e.g., "Greater Accra"
   - City/District: e.g., "Tesano", "Dansoman", "Haatso"
5. **Submit** → Location is added to database
6. **Automatic Selection** → Newly added location is automatically selected
7. **Available for All** → Next user will see this location in the list

### When Creating/Editing Listings:

The same system will be used in the create/edit listing forms. Users can:
- Select from existing locations
- Add new ones if their location doesn't exist
- See item counts to find popular locations

## Database Functions

### `add_new_location()`

Adds a new region and city to the database:

```sql
SELECT add_new_location(
  'Greater Accra',  -- Region name
  'Tesano',         -- City name  
  'user-uuid-here'  -- User ID
);
```

Returns JSON with the created/existing region and city IDs.

### `get_location_stats()`

Gets item counts for all locations:

```sql
SELECT * FROM get_location_stats();
```

Returns:
- region_id, region_name
- city_id, city_name
- item_count (number of items in that location)

## Data Structure

### Regions Table
```
id          | UUID (Primary Key)
name        | Text (e.g., "Greater Accra")
slug        | Text (e.g., "greater-accra")
is_active   | Boolean
created_at  | Timestamp
updated_at  | Timestamp
```

### Cities Table
```
id          | UUID (Primary Key)
region_id   | UUID (Foreign Key → regions)
name        | Text (e.g., "Madina")
slug        | Text (e.g., "madina")
is_active   | Boolean
created_at  | Timestamp
updated_at  | Timestamp
```

### Products_Services Table (Updated)
```
...existing fields...
region_id        | UUID (Foreign Key → regions)
city_id          | UUID (Foreign Key → cities)
location_details | Text (Additional location info)
```

## Default Data Loaded

The migration pre-loads:

**Regions (17):**
- All Ghana
- Greater Accra
- Ashanti
- Western
- Central
- Eastern
- Northern
- Volta
- Upper East
- Upper West
- Bono
- Bono East
- Ahafo
- Savannah
- North East
- Oti
- Western North

**Cities (Major ones):**
- **Greater Accra**: Accra Metropolitan, Tema, Madina, Adenta, Spintex, etc.
- **Ashanti**: Kumasi Metropolitan, Obuasi, Ejisu, Konongo, etc.
- **Western**: Takoradi, Sekondi, Tarkwa, Axim
- And more...

## Security

### Row Level Security (RLS)

**Read Policies:**
- Everyone can view active regions and cities
- No authentication required to browse locations

**Write Policies:**
- Only authenticated users can add new locations
- Prevents spam and abuse
- User ID is tracked for moderation

### Admin Controls

Admins can:
- Deactivate inappropriate locations (set `is_active = false`)
- Merge duplicate locations
- View who added which locations
- Monitor location usage statistics

## Troubleshooting

### "Function does not exist" error
- Make sure you ran the entire SQL migration
- Check that functions were created: `\df add_new_location` in psql

### Locations not showing
- Check RLS policies are enabled
- Verify `is_active = true` for regions/cities
- Check browser console for API errors

### Duplicate locations created
- The function checks for existing locations (case-insensitive)
- If duplicates appear, manually merge in SQL Editor:
  ```sql
  -- Update products to use correct location
  UPDATE products_services 
  SET city_id = 'correct-city-id' 
  WHERE city_id = 'duplicate-city-id';
  
  -- Delete duplicate
  DELETE FROM cities WHERE id = 'duplicate-city-id';
  ```

## Future Enhancements

Potential improvements:
1. Location verification system (admins approve new locations)
2. Merge duplicate locations automatically
3. Popular locations section
4. Location search/autocomplete
5. GPS-based location detection
6. Neighborhood/area level (beyond city)

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard
2. Verify RLS policies are correct
3. Test SQL functions directly in SQL Editor
4. Check app console for errors

---

**Status**: ✅ Fully implemented and tested
**Version**: 1.0
**Last Updated**: November 23, 2025
