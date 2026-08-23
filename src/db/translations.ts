/**
 * Nepali (NP) translations for dishes, keyed by the English dish name.
 * Used by the seed script and by the DB migration backfill so existing
 * databases receive the same translations as freshly seeded ones.
 */

export interface DishNp {
  name_np: string;
  description_np: string;
  category_np: string;
  badge_np: string;
}

export const DISH_NP: Record<string, DishNp> = {
  // ---- Signature dishes (homepage) ----
  'Sutra Fusion Mo:Mo Platter': {
    name_np: 'सुत्र फ्युजन म:म प्लेटर',
    description_np:
      'हातले बनाइएका नेपाली म:मको नयाँ रूप — उसिनेर, पान-फ्राई गरेर र हाम्रो विशेष सुत्र ग्लेजमा मिसाएर, तीन थरी चटनीसँग सर्भर गरिन्छ।',
    category_np: 'नेपाली',
    badge_np: 'सबैभन्दा रुचाइएको',
  },
  'Crispy Chilli Chicken & Sizzlers': {
    name_np: 'क्रिस्पी चिली चिकन र सिजलर',
    description_np:
      'क्रिस्पी चिली चिकन र आगोमा सेकिएका सिजलर, कास्ट-आइरन प्लेटमा धुँवादार गर्मीसहित तपाईंकै टेबलमा पुग्छन्।',
    category_np: 'चिनियाँ',
    badge_np: 'भिड मनपर्ने',
  },
  'Artisan Clay-Oven Pizzas': {
    name_np: 'आर्टिजन क्ले-ओभन पिज्जा',
    description_np:
      'हातले टस गरिएको पीठो, बिस्तारै पकाइएको टमाटर सस र क्ले ओभनको दाग — बाहिर क्रिस्पी, कहिल्यै लोच्याउने छैन।',
    category_np: 'कन्टिनेन्टल',
    badge_np: 'वुड-फायर्ड',
  },
  'Custom Handcrafted Mocktails & Cocktails': {
    name_np: 'कस्टम ह्यान्डक्राफ्टेड मकटेल र ककटेल',
    description_np:
      'ताजा सामग्रीसहित मुछिएर अर्डरमै शेक गरिने विशेष बार क्रिएसन — परिवारका लागि अल्कोहल-फ्रि, राति प्रिमियम पेय।',
    category_np: 'पेय पदार्थ',
    badge_np: 'बार क्राफ्ट',
  },

  // ---- Bestsellers (homepage + Full Digital Menu) ----
  'Bamboo Biryani': {
    name_np: 'बाँसको बिर्यानी',
    description_np: 'वास्तविक बाँसमा सुस्तरी पकाइएको, सुगन्धित नेपाली मसलासहित।',
    category_np: 'प्लेटरहरू',
    badge_np: 'सेफ स्पेशल',
  },
  'Sutra Momo Platter': {
    name_np: 'सुत्र म:म प्लेटर',
    description_np: 'स्टिम, फ्राई, कोठे, चिली र क्रन्ची म:मको १५ पीस कम्बो।',
    category_np: 'प्लेटरहरू',
    badge_np: 'अवश्य चाख्नुहोस्',
  },
  'Grand Indian Platter': {
    name_np: 'ग्रान्ड इन्डियन प्लेटर',
    description_np: 'तन्दुरी चिकन, सीख कबाब, बटर चिकन, नान र पुलाओ।',
    category_np: 'प्लेटरहरू',
    badge_np: 'समूहका लागि',
  },
  'Peri Peri Chicken Pizza': {
    name_np: 'पेरी पेरी चिकन पिज्जा',
    description_np: 'मसालेदार पेरी-पेरी चिकन, पग्लिएको मोजारेला र ताजा तरकारीसहित।',
    category_np: 'स्न्याक्स र पिज्जा',
    badge_np: '',
  },
  'Monster Fries': {
    name_np: 'मन्स्टर फ्राइज',
    description_np: 'पग्लिएको चिज र विशेष मसालेदार ससले भरिएका क्रिस्पी फ्राइज।',
    category_np: 'स्न्याक्स र पिज्जा',
    badge_np: '',
  },
  'Creamy Espresso Martini': {
    name_np: 'क्रिमी एस्प्रेसो मार्टिनी',
    description_np: 'ताजा एस्प्रेसो शट, डार्क स्पिरिट र स्मूथ क्रिमको मिश्रण।',
    category_np: 'ककटेल र हुक्का',
    badge_np: 'सिग्नेचर ड्रिंक',
  },
  'Cloud Hookah': {
    name_np: 'क्लाउड हुक्का',
    description_np: 'प्रिमियम स्मूथ स्मोक, विदेशी फलफूलका स्वादमा उपलब्ध।',
    category_np: 'ककटेल र हुक्का',
    badge_np: 'लाउन्ज फेवरेट',
  },
};

export const CATEGORY_NP: Record<string, string> = {
  Platters: 'प्लेटरहरू',
  'Snacks & Pizza': 'स्न्याक्स र पिज्जा',
  'Cocktails & Hookah': 'ककटेल र हुक्का',
  Nepali: 'नेपाली',
  Chinese: 'चिनियाँ',
  Continental: 'कन्टिनेन्टल',
  Beverages: 'पेय पदार्थ',
};

export const MENU_SUB_NP: Record<string, string> = {
  Platters: 'साझा गर्नका लागि बनाइएको, छाप छाड्ने — हेटौंडाले नामसँगै माग्ने परिकार।',
  'Snacks & Pizza': 'वुड-फायर्ड, भरिएको र चुपचाप साझा गर्न असम्भव।',
  'Cocktails & Hookah': 'लाउन्ज रातहरू यहीं सुरु हुन्छ — अर्डरमै शेक, उत्तम धुँवासहित।',
};

/**
 * Nepali (NP) translations for seed reviews, keyed by the English reviewer
 * name. Used by the seed script and by the DB migration backfill so existing
 * databases receive the same translations as freshly seeded ones.
 */
export interface ReviewNp {
  name_np: string;
  text_np: string;
}

export const REVIEW_NP: Record<string, ReviewNp> = {
  'Yogesh Sahani': {
    name_np: 'योगेश साहनी',
    text_np:
      'मैले हेटौंडाको सुत्र लाउन्जमा बिताएको समय साँच्चै रमाइलो भयो। यो ठाउँको वातावरण निकै राम्रो र आरामदायी छ, र साथी वा परिवारसँग समय बिताउन उत्तम ठाउँ हो।\nखाना स्वादिलो र राम्रोसँग सजाइएको थियो, र हामीले अर्डर गरेका सबै कुरा रमाइलो लाग्यो। मलाई वातावरण र संगीत पनि मन पर्‍यो — यसले सम्पूर्ण अनुभवलाई आरामदायी र रमाइलो बनायो। स्टाफ पनि मिलनसार थिए र सेवा पनि राम्रो थियो।\nसमग्रमा, सुत्र लाउन्जमा मेरो अनुभव उत्कृष्ट रह्यो। हेटौंडा आउँदा फेरि भेट्न पाउँदा खुसी हुने ठाउँ निश्चित रूपमा हो।',
  },
};
