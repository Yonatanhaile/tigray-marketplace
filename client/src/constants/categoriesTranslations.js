// Category and Subcategory Translations
export const CATEGORY_TRANSLATIONS = {
  en: {
    'Vehicles': 'Vehicles',
    'Property': 'Property',
    'Mobile Phones & Tablets': 'Mobile Phones & Tablets',
    'Electronics': 'Electronics',
    'Home, Furniture & Appliances': 'Home, Furniture & Appliances',
    'Fashion': 'Fashion',
    'Beauty & Personal Care': 'Beauty & Personal Care',
    'Services': 'Services',
    'Repair & Construction': 'Repair & Construction',
    'Commercial Equipment & Tools': 'Commercial Equipment & Tools',
    'Leisure & Activities': 'Leisure & Activities',
    'Musical Instruments': 'Musical Instruments',
    'Babies & Kids': 'Babies & Kids',
    'Food, Agriculture & Farming': 'Food, Agriculture & Farming',
    'Animals & Pets': 'Animals & Pets',
    'Jobs': 'Jobs'
  },
  am: {
    'Vehicles': 'ተሽከርካሪዎች',
    'Property': 'ንብረት',
    'Mobile Phones & Tablets': 'ሞባይል ስልኮች እና ታብሌቶች',
    'Electronics': 'ኤሌክትሮኒክስ',
    'Home, Furniture & Appliances': 'ቤት፣ የቤት እቃዎች እና መሳሪያዎች',
    'Fashion': 'ፋሽን',
    'Beauty & Personal Care': 'ውበትና ከራስ እንክብካቤ',
    'Services': 'አገልግሎቶች',
    'Repair & Construction': 'ጥገናና ግንባታ',
    'Commercial Equipment & Tools': 'የንግድ መሳሪያዎችና መሳሪያዎች',
    'Leisure & Activities': 'የመዝናኛ እና ድንቅርናዎች',
    'Musical Instruments': 'የሙዚቃ መሳሪያዎች',
    'Babies & Kids': 'ህጻናት እና ልጆች',
    'Food, Agriculture & Farming': 'ምግብ፣ ግብርና እና እርሻ',
    'Animals & Pets': 'እንስሳት እና የቤት እንስሳት',
    'Jobs': 'ስራዎች'
  },
  ti: {
    'Vehicles': 'ተሽከርካሪታት',
    'Property': 'ንብረት',
    'Mobile Phones & Tablets': 'ሞባይል ተሌፎናትን ታብሌታት',
    'Electronics': 'ኤሌክትሮኒክስ',
    'Home, Furniture & Appliances': 'ገዛ፣ የቤት እቃታትን መሳርሒታት',
    'Fashion': 'ፋሽን',
    'Beauty & Personal Care': 'ጽባቐን ውልቃዊ ክንክን',
    'Services': 'ኣገልግሎታት',
    'Repair & Construction': 'ጽገናን ህንጻ',
    'Commercial Equipment & Tools': 'ንግዲ መሳርሒታትን መሳርሒታት',
    'Leisure & Activities': 'መዘናእታን ንጥፈታት',
    'Musical Instruments': 'መሳርሒታት ሙዚቃ',
    'Babies & Kids': 'ህጻናትን ቆልዑት',
    'Food, Agriculture & Farming': 'መግቢ፣ ሕርሻን ዓምድ',
    'Animals & Pets': 'እንስሳታትን የቤት እንስሳታት',
    'Jobs': 'ስራሕታት'
  },
  om: {
    'Vehicles': 'Konkolaataa',
    'Property': 'Qabeenya',
    'Mobile Phones & Tablets': 'Bilbilaa fi Taabletii',
    'Electronics': 'Elektiroonikii',
    'Home, Furniture & Appliances': 'Mana, Meeshaalee Mannaa fi Mijatoota',
    'Fashion': 'Faashinii',
    'Beauty & Personal Care': 'Bareedduu fi Kunuunsa Dhuunfaa',
    'Services': 'Tajaajiloota',
    'Repair & Construction': 'Suphaa fi Ijaarsa',
    'Commercial Equipment & Tools': 'Meeshaalee Daldalaafi Meeshaalee',
    'Leisure & Activities': 'Boqonnaa fi Hojiiwwan',
    'Musical Instruments': 'Meeshaalee Muuziqaa',
    'Babies & Kids': 'Daa'imaa fi Ijoollee',
    'Food, Agriculture & Farming': 'Nyaata, Qonna fi Qonnaa',
    'Animals & Pets': 'Bineensotaa fi Bineensota Mana',
    'Jobs': 'Hojiiwwan'
  }
};

// Helper function to get translated category name
export const getCategoryTranslation = (category, language) => {
  return CATEGORY_TRANSLATIONS[language]?.[category] || category;
};

// Helper function to get all category names in a specific language
export const getAllCategoriesInLanguage = (language) => {
  return CATEGORY_TRANSLATIONS[language] || CATEGORY_TRANSLATIONS.en;
};

