import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Basic resources; expand as needed
const resources = {
  en: {
    translation: {
      appName: 'Tigray Market',
      browse: 'Browse',
      myListings: 'My Listings',
      myOrders: 'My Orders',
      adminPanel: 'Admin Panel',
      login: 'Login',
      signup: 'Sign Up',
      createListing: 'Create Listing',
      sellerDashboard: 'Seller Dashboard',
      recentListings: 'Recent Listings',
      viewAll: 'View All',
      howItWorks: 'How It Works',
      messages: 'Messages',
      newMessages: 'New Messages',
      viewMessages: 'View Messages',
      orderMessages: 'Order Messages',
    }
  },
  am: {
    translation: {
      appName: 'ትግራይ ገበያ',
      browse: 'ፈልግ',
      myListings: 'የኔ ሊስቲንጎች',
      myOrders: 'የኔ ትእዛዞች',
      adminPanel: 'የአስተዳዳሪ ፓነል',
      login: 'ግባ',
      signup: 'መመዝገቢያ',
      createListing: 'ሊስቲንግ ፍጠር',
      sellerDashboard: 'የሻጭ ዳሽቦርድ',
      recentListings: 'የቅርብ ሊስቲንጎች',
      viewAll: 'ሁሉንም ተመልከት',
      howItWorks: 'እንዴት እየሰራ ነው',
      messages: 'መልዕክቶች',
      newMessages: 'አዲስ መልዕክቶች',
      viewMessages: 'መልዕክቶች ይመልከቱ',
      orderMessages: 'የትእዛዝ መልዕክቶች',
    }
  },
  ti: {
    translation: {
      appName: 'ገበያ ትግራይ',
      browse: 'ድለዮ',
      myListings: 'ዝርዝር የኔ',
      myOrders: 'ሕሳብ የኔ',
      adminPanel: 'ፓነል ኣድሚን',
      login: 'እቶ',
      signup: 'ምመዝገብ',
      createListing: 'ዝርዝር ፍጠር',
      sellerDashboard: 'ዳሽቦርድ ቻጽ',
      recentListings: 'ቅርብ ዝርዝራት',
      viewAll: 'ኩሉ ርኣይ',
      howItWorks: 'ከመይ ይሰርሕ',
      messages: 'መልእኽቲ',
      newMessages: 'ሓድሽ መልእኽቲ',
      viewMessages: 'መልእኽቲ ርኣይ',
      orderMessages: 'መልእኽቲ እዋን',
    }
  },
  om: {
    translation: {
      appName: 'Gabaa Tigray',
      browse: 'Barbaadi',
      myListings: 'Tarreewwan koo',
      myOrders: 'Ajajawwan koo',
      adminPanel: 'Paanelii Bulchaa',
      login: 'Seeni',
      signup: 'Galmaa’i',
      createListing: 'Tarree Haaraa Uumi',
      sellerDashboard: 'Daashboordii Gurgurtaa',
      recentListings: 'Tarreewwan Haaraa',
      viewAll: 'Hunda Ilaali',
      howItWorks: 'Akkamitti Dalaga',
      messages: 'Ergaawwan',
      newMessages: 'Ergaawwan Haaraa',
      viewMessages: 'Ergaawwan Ilaali',
      orderMessages: 'Ergaawwan Ajajaa',
    }
  }
};

const savedLng = localStorage.getItem('lng') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export function setLanguage(lng) {
  i18n.changeLanguage(lng);
  localStorage.setItem('lng', lng);
}

export default i18n;


