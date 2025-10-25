import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ChatManagement from './pages/ChatManagement';
import QuickActionManagement from './pages/QuickActionManagement';
import EducationalListingsManagement from './pages/EducationalListingsManagement';
import EducationalListingsManagement from './pages/EducationalListingsManagement';
import NewsManagement from './pages/NewsManagement';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="chats" element={<ChatManagement />} />
              <Route path="quick-actions" element={<QuickActionManagement />} />
              <Route path="educational-listings" element={<EducationalListingsManagement />} />
              <Route path="educational-listings" element={<EducationalListingsManagement />} />
              <Route path="news" element={<NewsManagement />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;