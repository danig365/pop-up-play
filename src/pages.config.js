import About from './pages/About';
import AccessCodeManager from './pages/AccessCodeManager';
import AllProfiles from './pages/AllProfiles';
import BlockedUsers from './pages/BlockedUsers';
import Broadcast from './pages/Broadcast';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import EnterAccessCode from './pages/EnterAccessCode';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Login from './pages/Login';
import Menu from './pages/Menu';
import Pricing from './pages/Pricing';
import Profile from './pages/Profile';
import Reels from './pages/Reels';
import ResetPassword from './pages/ResetPassword';
import Signup from './pages/Signup';
import SubscriptionSettings from './pages/SubscriptionSettings';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import VideoCall from './pages/VideoCall';
import OnlineMembers from './pages/OnlineMembers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AccessCodeManager": AccessCodeManager,
    "AllProfiles": AllProfiles,
    "BlockedUsers": BlockedUsers,
    "Broadcast": Broadcast,
    "Chat": Chat,
    "Dashboard": Dashboard,
    "EnterAccessCode": EnterAccessCode,
    "ForgotPassword": ForgotPassword,
    "Home": Home,
    "Login": Login,
    "Menu": Menu,
    "Pricing": Pricing,
    "Profile": Profile,
    "Reels": Reels,
    "ResetPassword": ResetPassword,
    "Signup": Signup,
    "SubscriptionSettings": SubscriptionSettings,
    "SubscriptionSuccess": SubscriptionSuccess,
    "VideoCall": VideoCall,
    "OnlineMembers": OnlineMembers,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};