import { createClient } from '@supabase/supabase-js';

// Get environment variables or default to blank
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if we should use Mock Mode
const useMockMode = !supabaseUrl || !supabaseAnonKey || 
                    supabaseUrl.includes('YOUR_') || 
                    supabaseAnonKey.includes('YOUR_');

let supabase;

if (useMockMode) {
  console.warn(
    '⚠️ Supabase credentials missing or set to placeholder. Operating in MOCK MODE with LocalStorage persistence.'
  );
  
  // Implementation of a client mock matching Supabase API surface
  class MockQueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.data = JSON.parse(localStorage.getItem(`sp_mock_${table}`) || '[]');
    }

    select(columns = '*') {
      // Chainable
      return this;
    }

    insert(records) {
      this.insertRecords = records;
      return this;
    }

    update(fields) {
      this.updateFields = fields;
      return this;
    }

    delete() {
      this.isDelete = true;
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, value, type: 'eq' });
      return this;
    }

    in(column, values) {
      this.filters.push({ column, values, type: 'in' });
      return this;
    }

    // Execute the query chain (thenable)
    async then(resolve) {
      try {
        let result = [...this.data];

        // Apply filters
        for (const filter of this.filters) {
          if (filter.type === 'eq') {
            result = result.filter(item => item[filter.column] === filter.value);
          } else if (filter.type === 'in') {
            result = result.filter(item => filter.values.includes(item[filter.column]));
          }
        }

        // Apply Insert actions
        if (this.insertRecords) {
          const newRecords = Array.isArray(this.insertRecords) ? this.insertRecords : [this.insertRecords];
          const processed = newRecords.map(r => ({
            id: r.id || 'id_' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            ...r
          }));
          
          this.data.push(...processed);
          localStorage.setItem(`sp_mock_${this.table}`, JSON.stringify(this.data));
          return resolve({ data: processed, error: null });
        }

        // Apply Update actions
        if (this.updateFields) {
          const updatedRecords = [];
          this.data = this.data.map(item => {
            // Check if matches query filters
            let matches = true;
            for (const filter of this.filters) {
              if (filter.type === 'eq' && item[filter.column] !== filter.value) matches = false;
              if (filter.type === 'in' && !filter.values.includes(item[filter.column])) matches = false;
            }

            if (matches) {
              const updated = { ...item, ...this.updateFields };
              updatedRecords.push(updated);
              return updated;
            }
            return item;
          });
          
          localStorage.setItem(`sp_mock_${this.table}`, JSON.stringify(this.data));
          return resolve({ data: updatedRecords, error: null });
        }

        // Apply Delete actions
        if (this.isDelete) {
          const deletedRecords = [];
          this.data = this.data.filter(item => {
            let matches = true;
            for (const filter of this.filters) {
              if (filter.type === 'eq' && item[filter.column] !== filter.value) matches = false;
              if (filter.type === 'in' && !filter.values.includes(item[filter.column])) matches = false;
            }

            if (matches) {
              deletedRecords.push(item);
              return false; // Remove
            }
            return true; // Keep
          });

          localStorage.setItem(`sp_mock_${this.table}`, JSON.stringify(this.data));
          return resolve({ data: deletedRecords, error: null });
        }

        // Return standard selections
        resolve({ data: result, error: null });
      } catch (err) {
        resolve({ data: null, error: err });
      }
    }
  }

  class MockSupabaseClient {
    constructor() {
      this.initMockData();
      
      this.auth = {
        listeners: [],
        
        getSession: async () => {
          const user = JSON.parse(localStorage.getItem('sp_mock_user') || 'null');
          return { data: { session: user ? { user } : null }, error: null };
        },

        signInWithPassword: async ({ email, password }) => {
          const users = JSON.parse(localStorage.getItem('sp_mock_users') || '[]');
          const user = users.find(u => u.email === email);
          if (!user) {
            return { data: null, error: { message: 'Invalid email or password (Mock database check).' } };
          }
          
          localStorage.setItem('sp_mock_user', JSON.stringify(user));
          this.auth.triggerStateChange('SIGNED_IN', user);
          return { data: { user, session: { user } }, error: null };
        },

        signUp: async ({ email, password, options }) => {
          const username = options?.data?.username || email.split('@')[0];
          const avatar_seed = options?.data?.avatar_seed || 'car';
          const avatar_url = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatar_seed}`;
          
          const users = JSON.parse(localStorage.getItem('sp_mock_users') || '[]');
          if (users.find(u => u.email === email)) {
            return { data: null, error: { message: 'A user with this email already exists.' } };
          }

          const newUser = {
            id: 'usr_' + Math.random().toString(36).substr(2, 9),
            email,
            username,
            avatar_url,
            created_at: new Date().toISOString()
          };

          users.push(newUser);
          localStorage.setItem('sp_mock_users', JSON.stringify(users));
          
          // Auto-sign in
          localStorage.setItem('sp_mock_user', JSON.stringify(newUser));
          this.auth.triggerStateChange('SIGNED_IN', newUser);
          
          // Add user to default Group
          const groupMembers = JSON.parse(localStorage.getItem('sp_mock_group_members') || '[]');
          groupMembers.push({
            group_id: 'family-group-123',
            user_id: newUser.id,
            joined_at: new Date().toISOString()
          });
          localStorage.setItem('sp_mock_group_members', JSON.stringify(groupMembers));

          return { data: { user: newUser, session: { user: newUser } }, error: null };
        },

        signInWithOAuth: async ({ provider, options }) => {
          const email = `mock.${provider}@example.com`;
          const username = `mock_${provider}`;
          const avatar_seed = provider === 'google' ? 'sparky' : 'shadow';
          const avatar_url = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatar_seed}`;
          
          const users = JSON.parse(localStorage.getItem('sp_mock_users') || '[]');
          let user = users.find(u => u.email === email);
          if (!user) {
            user = {
              id: 'usr_' + Math.random().toString(36).substr(2, 9),
              email,
              username,
              avatar_url,
              created_at: new Date().toISOString()
            };
            users.push(user);
            localStorage.setItem('sp_mock_users', JSON.stringify(users));
            
            // Add user to default Group
            const groupMembers = JSON.parse(localStorage.getItem('sp_mock_group_members') || '[]');
            groupMembers.push({
              group_id: 'family-group-123',
              user_id: user.id,
              joined_at: new Date().toISOString()
            });
            localStorage.setItem('sp_mock_group_members', JSON.stringify(groupMembers));
          }
          
          localStorage.setItem('sp_mock_user', JSON.stringify(user));
          this.auth.triggerStateChange('SIGNED_IN', user);
          return { data: { user, session: { user } }, error: null };
        },

        signOut: async () => {
          localStorage.removeItem('sp_mock_user');
          this.auth.triggerStateChange('SIGNED_OUT', null);
          return { error: null };
        },

        onAuthStateChange: (callback) => {
          this.auth.listeners.push(callback);
          this.auth.getSession().then(({ data: { session } }) => {
            callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
          });
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  this.auth.listeners = this.auth.listeners.filter(l => l !== callback);
                }
              }
            }
          };
        },

        triggerStateChange: (event, user) => {
          const session = user ? { user } : null;
          this.auth.listeners.forEach(l => l(event, session));
        }
      };
    }

    initMockData() {
      // 1. Users Mock
      if (!localStorage.getItem('sp_mock_users')) {
        localStorage.setItem('sp_mock_users', JSON.stringify([]));
      }
      
      // 2. Groups Mock
      if (!localStorage.getItem('sp_mock_groups')) {
        const defaultGroups = [
          { id: 'family-group-123', name: 'Family Car Share', created_by: 'system', created_at: new Date().toISOString() },
          { id: 'office-pool-789', name: 'Office Fleet', created_by: 'system', created_at: new Date().toISOString() }
        ];
        localStorage.setItem('sp_mock_groups', JSON.stringify(defaultGroups));
      }

      // 3. Group Members Mock (link system/admin members to default groups)
      if (!localStorage.getItem('sp_mock_group_members')) {
        localStorage.setItem('sp_mock_group_members', JSON.stringify([]));
      }

      // 4. Objects Mock
      if (!localStorage.getItem('sp_mock_objects')) {
        const defaultObjects = [
          {
            id: 'car-suv-123',
            group_id: 'family-group-123',
            name: "Mom's SUV",
            icon: '🚙',
            last_latitude: 40.7128,
            last_longitude: -74.0060,
            last_updated_at: new Date(Date.now() - 3600000).toISOString(),
            last_updated_by: 'system'
          },
          {
            id: 'car-roadster-456',
            group_id: 'family-group-123',
            name: "Dad's Roadster",
            icon: '🚗',
            last_latitude: 40.7306,
            last_longitude: -73.9352,
            last_updated_at: new Date(Date.now() - 7200000).toISOString(),
            last_updated_by: 'system'
          },
          {
            id: 'van-delivery-789',
            group_id: 'office-pool-789',
            name: 'Delivery Van',
            icon: '🚐',
            last_latitude: 40.6782,
            last_longitude: -73.9442,
            last_updated_at: new Date().toISOString(),
            last_updated_by: 'system'
          }
        ];
        localStorage.setItem('sp_mock_objects', JSON.stringify(defaultObjects));
      }

      // 5. User Object Devices Mock (user-specific Bluetooth devices)
      if (!localStorage.getItem('sp_mock_user_object_devices')) {
        const defaultPairings = [
          { user_id: 'system', object_id: 'car-suv-123', ble_device_id: 'CAR_BLE_MOCK_DEV', paired_at: new Date().toISOString() },
          { user_id: 'system', object_id: 'car-roadster-456', ble_device_id: 'ROADSTER_BLE', paired_at: new Date().toISOString() },
          { user_id: 'system', object_id: 'van-delivery-789', ble_device_id: 'VAN_BLE', paired_at: new Date().toISOString() }
        ];
        localStorage.setItem('sp_mock_user_object_devices', JSON.stringify(defaultPairings));
      }
    }

    from(table) {
      return new MockQueryBuilder(table);
    }
  }

  supabase = new MockSupabaseClient();
} else {
  // Real Supabase Initialization
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase, useMockMode };
