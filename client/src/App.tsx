import { useLocation } from 'react-router-dom';

function AppContent() {
    const location = useLocation();

    useEffect(() => {
        checkAuthStatus();
    }, [location.pathname]);

    // rest of the AppContent function
}