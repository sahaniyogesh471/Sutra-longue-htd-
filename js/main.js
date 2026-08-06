/* ============================================================
   SUTRA LOUNGE — Interactions
   i18n · theme · nav · hero · gallery · video · form
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. i18n dictionary ---------- */
  const I18N = {
    en: {
      'nav.home': 'Home', 'nav.about': 'About', 'nav.menu': 'Signature Dishes',
      'nav.best': 'Bestsellers',
      'nav.gallery': 'Gallery', 'nav.reviews': 'Reviews', 'nav.visit': 'Visit Us',
      'nav.reserve': 'Reserve a Table',

      'hero.eyebrow': 'Premium Multi-Cuisine Resto-Lounge & Bar',
      'hero.title': 'Sumptuous Food. Great Music. Unforgettable Times.',
      'hero.sub': "Hupra's premier dining destination in Hetauda — handcrafted multi-cuisine dishes, wood-fired flavour, hand-mixed cocktails and a lounge soundtrack that keeps the night alive.",
      'hero.reserve': 'Reserve a Table',
      'hero.whatsapp': 'WhatsApp Us',
      'hero.meta1': 'Hupra, Hetauda-4 · Makwanpur',
      'hero.meta2': 'Open Daily 11 AM – 11 PM',
      'hero.video': 'Watch the Sutra Lounge Tour',
      'hero.scroll': 'Scroll',

      'about.kicker': 'Our Story',
      'about.title': "Where Hetauda comes to slow down & savour",
      'about.badge': 'Days a week · open 11 AM – 11 PM',
      'about.lead': 'Sutra Lounge was born from a simple belief — that great evenings are built on three things: sumptuous food, great music and unforgettable times.',
      'about.body': "Set in the heart of Hupra, our kitchen blends Nepali soul with international craft. Momos are folded by hand each morning, dough is stretched for the clay oven every afternoon, and the bar shakes to order through the night. Whether it is a family dinner, a celebration or a quiet date, our lounge is designed to make the moment last.",
      'about.p1': 'Hand-finished signature recipes from our head chef',
      'about.p2': 'Fresh ingredients sourced daily from local Hetauda markets',
      'about.p3': 'Live music, curated playlists and a buzzing lounge vibe',
      'about.cta': 'Explore Our Signature Dishes',

      'menu.kicker': 'From Our Kitchen',
      'menu.title': 'Signature Dishes Worth the Trip',
      'menu.sub': "The plates that put Sutra Lounge on the map — each one a signature you won't find anywhere else in Hetauda.",
      'menu.tag1': 'Most Loved', 'menu.tag2': 'Crowd Favourite', 'menu.tag3': 'Wood-Fired', 'menu.tag4': 'Bar Craft',
      'menu.d1.name': 'Sutra Fusion Mo:Mo Platter',
      'menu.d1.desc': 'Hand-folded Nepali momos reinvented — steamed, pan-fried and tossed in our signature Sutra glaze, served with three house dips.',
      'menu.d1.note': "Chef's recommendation",
      'menu.d2.name': 'Crispy Chilli Chicken & Sizzlers',
      'menu.d2.desc': 'Crackling-crisp chilli chicken and flame-kissed sizzlers, brought to your table smoking hot on a cast-iron plate.',
      'menu.d2.note': 'Served sizzling',
      'menu.d3.name': 'Artisan Clay-Oven Pizzas',
      'menu.d3.desc': "Hand-tossed dough, slow-simmered tomato sauce and blistered char from our clay oven — street-crisp, never floppy.",
      'menu.d3.note': 'Baked to order',
      'menu.d4.name': 'Custom Handcrafted Mocktails & Cocktails',
      'menu.d4.desc': 'Bespoke bar creations muddled fresh and shaken to order — zero-proof signatures for families, premium pours after dark.',
      'menu.d4.note': 'Mixed to your taste',
      'menu.order': 'Reserve to Taste',
      'menu.note': 'Craving something specific? Our full multi-cuisine menu spans Nepali, Chinese, Continental and more.',
      'menu.full': 'Get the full menu on WhatsApp',

      'bestsellers.kicker': 'Our Popular Selections',
      'bestsellers.title': 'Sutra Lounge Favorites',
      'bestsellers.sub': 'Handcrafted signatures, group platters, and lounge classics.',
      'bestsellers.cta': 'Explore Full Digital Menu',
      'bestsellers.ctaNote': 'Live prices · Updated every week',
      'bestsellers.tab.all': 'All Bestsellers',
      'bestsellers.tab.platters': 'Platters',
      'bestsellers.tab.snacks': 'Snacks & Pizza',
      'bestsellers.tab.drinks': 'Cocktails & Hookah',
      'bestsellers.order': 'Order Now',
      'bestsellers.quick': 'Quick View',

      'why.kicker': 'The Sutra Difference',
      'why.title': 'Why Hetauda Chooses Sutra Lounge',
      'why.c1.title': 'Fresh, Honest Ingredients',
      'why.c1.desc': 'Markets sourced daily in Hetauda — fresh vegetables, quality meats and hand-ground spices in every single dish.',
      'why.c2.title': 'Chef-Approved Flavours',
      'why.c2.desc': 'Signature recipes crafted by our head chef, tested and perfected until every plate leaves the kitchen flawless.',
      'why.c3.title': 'Music That Sets the Mood',
      'why.c3.desc': 'From easy lounge sets to live nights, our soundtrack is curated so your conversation and your evening flow just right.',
      'why.c4.title': 'Warm, Family-Friendly Service',
      'why.c4.desc': 'Couples, families and friends alike — our team treats every guest like the only table in the house, from greeting to goodbye.',

      'video.kicker': 'Sutra Lounge Tour',
      'video.title': 'Step Inside the Lounge',
      'video.sub': 'A taste of the atmosphere, the music and the nights — see why Hetauda loves Sutra Lounge.',

      'gallery.kicker': 'A Taste of the Experience',
      'gallery.title': 'Inside Sutra Lounge',
      'gallery.sub': 'Plates, pours and the ambience that makes the evening — a glimpse of what is waiting for you.',

      'reviews.kicker': 'Guest Stories',
      'reviews.title': 'Loved by Hetauda',
      'reviews.r1.text': 'The Sutra Fusion Mo:Mo Platter is unlike anything else in Hetauda. Warm service, great music, and an evening we are still talking about.',
      'reviews.r1.tag': 'Dinner with family',
      'reviews.r2.text': "Best sizzlers in town, without a doubt. The clay-oven pizza tastes like it was flown in from Kathmandu's top kitchens.",
      'reviews.r2.tag': 'Weekend regular',
      'reviews.r3.text': 'Perfect for a family dinner or a date night. The staff treated us like guests, not customers — and the mocktails were superb.',
      'reviews.r3.tag': 'Date night',
      'reviews.r4.text': 'The lounge transforms into a proper party spot after dark. Great vibe, great drinks, and the crispy chilli chicken is addictive.',
      'reviews.r4.tag': 'Night out with friends',

      'visit.kicker': 'Find Us',
      'visit.title': 'In the Heart of Hupra, Hetauda',
      'visit.sub': 'Easy to reach, easy to park, hard to leave. Drop by for lunch, an evening sizzler, or a night of cocktails and music.',
      'visit.addrTitle': 'Address', 'visit.addr': 'Hupra, Hetauda-4, Makwanpur, Nepal',
      'visit.hoursTitle': 'Opening Hours', 'visit.hours': 'Monday – Sunday · 11:00 AM – 11:00 PM',
      'visit.hoursNote': 'Open every single day — no off days',
      'visit.directions': 'Get Directions on Google Maps', 'visit.reserve': 'Reserve a Table',

      'contact.kicker': 'Reservations',
      'contact.title': 'Book Your Table Tonight',
      'contact.sub': 'Tables fill fast on weekends. Send a request and our team will confirm on WhatsApp — or call us and we will sort it in a minute.',
      'contact.callLabel': 'Call us', 'contact.waLabel': 'WhatsApp', 'contact.emailLabel': 'Write to us',
      'contact.socialLabel': 'Follow the flavour',
      'contact.formTitle': 'Request a Reservation',
      'contact.fName': 'Full name', 'contact.fPhone': 'Phone number', 'contact.fDate': 'Date',
      'contact.fTime': 'Time', 'contact.fGuests': 'Guests', 'contact.fNote': 'Special requests',
      'contact.optional': '(optional)',
      'contact.submit': 'Send Reservation via WhatsApp',
      'contact.alt': 'Prefer to talk? Call <a href="tel:057522111">057-522111</a> — we answer every call.',

      'footer.tag': 'Premium multi-cuisine resto-lounge & bar. Sumptuous food, great music, unforgettable times.',
      'footer.explore': 'Explore', 'footer.contact': 'Contact', 'footer.hours': 'Opening Hours',
      'footer.hoursLine': 'Mon – Sun · 11:00 AM – 11:00 PM',
      'footer.addr': 'Hupra, Hetauda-4, Makwanpur, Nepal',
      'footer.rights': '© {{year}} Sutra Lounge. All rights reserved.',
      'footer.love': 'Made with flavour in Hetauda',

      'mobile.call': 'Call', 'mobile.wa': 'WhatsApp', 'mobile.reserve': 'Reserve'
    },

    np: {
      'nav.home': 'गृहपृष्ठ', 'nav.about': 'परिचय', 'nav.menu': 'विशेष परिकार',
      'nav.best': 'उत्कृष्ट विक्री',
      'nav.gallery': 'ग्यालरी', 'nav.reviews': 'समीक्षा', 'nav.visit': 'भेट्नुहोस्',
      'nav.reserve': 'टेबल बुक गर्नुहोस्',

      'hero.eyebrow': 'प्रिमियम मल्टि-क्युजिन रेस्टो-लाउन्ज र बार',
      'hero.title': 'स्वादिलो खाना। उत्कृष्ट संगीत। अविस्मरणीय क्षण।',
      'hero.sub': 'हेटौंडाको हुप्रामा रहेको उत्कृष्ट डाइनिङ डेस्टिनेसन — हस्तनिर्मित मल्टि-क्युजिन परिकार, वुड-फायर्ड स्वाद, हातले बनाइएका ककटेल र रातभरि जीवन्त रहने लाउन्ज संगीत।',
      'hero.reserve': 'टेबल बुक गर्नुहोस्',
      'hero.whatsapp': 'ह्वाट्सएप गर्नुहोस्',
      'hero.meta1': 'हुप्रा, हेटौंडा-४ · मकवानपुर',
      'hero.meta2': 'दैनिक बिहान ११ – राति ११ बजेसम्म',
      'hero.video': 'सुत्र लाउन्ज टुर हेर्नुहोस्',
      'hero.scroll': 'स्क्रोल गर्नुहोस्',

      'about.kicker': 'हाम्रो कथा',
      'about.title': 'हेटौंडा बसेर स्वाद चाख्ने ठाउँ',
      'about.badge': 'हप्ताको सातै दिन · बिहान ११ – राति ११ बजे खुला',
      'about.lead': 'सुत्र लाउन्जको जन्म एउटा सरल विश्वासबाट भएको हो — राम्रा साँझ तीन कुराले बन्छन्: स्वादिलो खाना, उत्कृष्ट संगीत र अविस्मरणीय क्षण।',
      'about.body': 'हुप्राको मुटुमा अवस्थित हाम्रो किचनले नेपाली स्वादलाई अन्तर्राष्ट्रिय कलासँग मिसाउँछ। म:म हरेक बिहान हातले बनाइन्छ, क्ले ओभनका लागि पीठो हरेक दिउँसो मुछिन्छ, र बारले रातभरि अर्डरमा शेक गर्छ। पारिवारिक भोज, उत्सव वा शान्त डेट — जे भए पनि हाम्रो लाउन्ज तपाईंको क्षणलाई अविस्मरणीय बनाउन डिजाइन गरिएको छ।',
      'about.p1': 'हेड सेफद्वारा हस्तलिखित विशेष रेसिपी',
      'about.p2': 'हेटौंडाका स्थानीय बजारबाट दैनिक ताजा सामग्री',
      'about.p3': 'लाइभ म्युजिक, छनोट गरिएका प्लेलिस्ट र जीवन्त लाउन्ज भाइब',
      'about.cta': 'हाम्रा विशेष परिकार हेर्नुहोस्',

      'menu.kicker': 'हाम्रो किचनबाट',
      'menu.title': 'यात्रा गर्न लायक विशेष परिकार',
      'menu.sub': 'सुत्र लाउन्जलाई चर्चित बनाउने परिकारहरू — हेटौंडामा अरू कतै पाउन नसकिने हस्ताक्षर व्यञ्जनहरू।',
      'menu.tag1': 'सबैभन्दा रुचाइएको', 'menu.tag2': 'भिड मनपर्ने', 'menu.tag3': 'वुड-फायर्ड', 'menu.tag4': 'बार क्राफ्ट',
      'menu.d1.name': 'सुत्र फ्युजन म:म प्लेटर',
      'menu.d1.desc': 'हातले बनाइएका नेपाली म:मको नयाँ रूप — उसिनेर, पान-फ्राई गरेर र हाम्रो विशेष सुत्र ग्लेजमा मिसाएर, तीन थरी चटनीसँग सर्भर गरिन्छ।',
      'menu.d1.note': 'सेफको सिफारिस',
      'menu.d2.name': 'क्रिस्पी चिली चिकन र सिजलर',
      'menu.d2.desc': 'क्रिस्पी चिली चिकन र आगोमा सेकिएका सिजलर, कास्ट-आइरन प्लेटमा धुँवादार गर्मीसहित तपाईंकै टेबलमा पुग्छन्।',
      'menu.d2.note': 'सिजलिंग सर्भर',
      'menu.d3.name': 'आर्टिजन क्ले-ओभन पिज्जा',
      'menu.d3.desc': 'हातले टस गरिएको पीठो, बिस्तारै पकाइएको टमाटर सस र क्ले ओभनको दाग — बाहिर क्रिस्पी, कहिल्यै लोच्याउने छैन।',
      'menu.d3.note': 'अर्डरमै बेक',
      'menu.d4.name': 'कस्टम ह्यान्डक्राफ्टेड मकटेल र ककटेल',
      'menu.d4.desc': 'ताजा सामग्रीसहित मुछिएर अर्डरमै शेक गरिने विशेष बार क्रिएसन — परिवारका लागि अल्कोहल-फ्रि, राति प्रिमियम पेय।',
      'menu.d4.note': 'तपाईंको रोजाइअनुसार',
      'menu.order': 'बुक गरी चाख्नुहोस्',
      'menu.note': 'विशेष केही चाहनुहुन्छ? हाम्रो पूर्ण मल्टि-क्युजिन मेनुमा नेपाली, चिनियाँ, कन्टिनेन्टल र थप समावेश छन्।',
      'menu.full': 'ह्वाट्सएपमा पूर्ण मेनु लिनुहोस्',

      'bestsellers.kicker': 'हाम्रा लोकप्रिय छनोटहरू',
      'bestsellers.title': 'सुत्र लाउन्जका मनपर्ने परिकार',
      'bestsellers.sub': 'हस्तकला सिग्नेचर, समूह प्लेटर र लाउन्ज क्लासिकहरू।',
      'bestsellers.cta': 'पूर्ण डिजिटल मेनु हेर्नुहोस्',
      'bestsellers.ctaNote': 'वास्तविक मूल्य · हरेक हप्ता अपडेट',
      'bestsellers.tab.all': 'सबै बेस्टसेलर',
      'bestsellers.tab.platters': 'प्लेटरहरू',
      'bestsellers.tab.snacks': 'स्न्याक्स र पिज्जा',
      'bestsellers.tab.drinks': 'ककटेल र हुक्का',
      'bestsellers.order': 'अर्डर गर्नुहोस्',
      'bestsellers.quick': 'द्रुत हेराइ',

      'why.kicker': 'सुत्रको विशेषता',
      'why.title': 'हेटौंडाले सुत्र लाउन्ज किन रोज्छ',
      'why.c1.title': 'ताजा, सच्चा सामग्री',
      'why.c1.desc': 'हेटौंडाका बजारबाट दैनिक आपूर्ति — हरेक परिकारमा ताजा तरकारी, गुणस्तरीय मासु र हातले पिसेका मसला।',
      'why.c2.title': 'सेफ-अप्रुभ्ड स्वाद',
      'why.c2.desc': 'हेड सेफले सिर्जना गरेका विशेष रेसिपीहरू — हरेक प्लेट किचनबाट बाहिरिनुअघि परीक्षण गरेर उत्तम बनाइएको।',
      'why.c3.title': 'मुड बनाउने संगीत',
      'why.c3.desc': 'शान्त लाउन्ज सेटदेखि लाइभ नाइटसम्म — तपाईंको कुराकानी र साँझ उत्तम लयमा चलोस् भन्ने हिसाबले संगीत छनोट गरिन्छ।',
      'why.c4.title': 'न्यानो, परिवार-मैत्री सेवा',
      'why.c4.desc': 'जोडी, परिवार र साथीहरू — हाम्रो टोलीले हरेक पाहुनालाई घरकै सदस्यझैं स्वागत गर्छ।',

      'video.kicker': 'सुत्र लाउन्ज टुर',
      'video.title': 'लाउन्जभित्रको झलक',
      'video.sub': 'वातावरण, संगीत र रातहरूको स्वाद — हेटौंडाले सुत्र लाउन्ज किन मन पराउँछ हेर्नुहोस्।',

      'gallery.kicker': 'अनुभवको झलक',
      'gallery.title': 'सुत्र लाउन्ज भित्र',
      'gallery.sub': 'परिकार, पेय र साँझ बनाउने वातावरण — तपाईंका लागि के कुरिरहेको छ भन्ने एक झलक।',

      'reviews.kicker': 'पाहुनाका अनुभव',
      'reviews.title': 'हेटौंडाको माया',
      'reviews.r1.text': 'सुत्र फ्युजन म:म प्लेटर हेटौंडामा अरू कतै छैन। न्यानो सेवा, उत्कृष्ट संगीत र अहिले पनि सम्झिरहने एउटा साँझ।',
      'reviews.r1.tag': 'परिवारसँग डिनर',
      'reviews.r2.text': 'शहरकै उत्कृष्ट सिजलर, कुनै शंका छैन। क्ले-ओभन पिज्जा काठमाडौंका उत्कृष्ट किचनबाट ल्याइएजस्तै लाग्छ।',
      'reviews.r2.tag': 'सप्ताहन्ते ग्राहक',
      'reviews.r3.text': 'पारिवारिक भोज वा डेट नाइटका लागि उत्तम। स्टाफले ग्राहक होइन, पाहुनाजस्तै व्यवहार गरे — मकटेल पनि उत्कृष्ट।',
      'reviews.r3.tag': 'डेट नाइट',
      'reviews.r4.text': 'रात पर्दा लाउन्ज साँच्चै पार्टी स्पटमा बदलिन्छ। उत्कृष्ट भाइब, उत्कृष्ट पेय, र क्रिस्पी चिली चिकन त झनै लत लगाउने।',
      'reviews.r4.tag': 'साथीहरूसँग रात',

      'visit.kicker': 'हामीलाई भेट्नुहोस्',
      'visit.title': 'हुप्रा, हेटौंडाको मुटुमा',
      'visit.sub': 'पुग्न सजिलो, पार्किङ सजिलो, छाड्न गाह्रो। लन्च, साँझको सिजलर वा ककटेल र संगीतको रातका लागि आउनुहोस्।',
      'visit.addrTitle': 'ठेगाना', 'visit.addr': 'हुप्रा, हेटौंडा-४, मकवानपुर, नेपाल',
      'visit.hoursTitle': 'खुल्ने समय', 'visit.hours': 'सोमबार – आइतबार · बिहान ११ – राति ११ बजे',
      'visit.hoursNote': 'हरेक दिन खुला — बिदा छैन',
      'visit.directions': 'गुगल म्याप्समा बाटो हेर्नुहोस्', 'visit.reserve': 'टेबल बुक गर्नुहोस्',

      'contact.kicker': 'रिजर्भेसन',
      'contact.title': 'आज रात तपाईंको टेबल बुक गर्नुहोस्',
      'contact.sub': 'सप्ताहन्तमा टेबल चाँडै भरिन्छन्। अनुरोध पठाउनुहोस् — हाम्रो टोलीले ह्वाट्सएपमा पुष्टि गर्नेछ, वा कल गर्नुहोस् र एकै मिनेटमा मिलाइदिन्छौं।',
      'contact.callLabel': 'कल गर्नुहोस्', 'contact.waLabel': 'ह्वाट्सएप', 'contact.emailLabel': 'इमेल गर्नुहोस्',
      'contact.socialLabel': 'स्वाद पछ्याउनुहोस्',
      'contact.formTitle': 'रिजर्भेसन अनुरोध गर्नुहोस्',
      'contact.fName': 'पूरा नाम', 'contact.fPhone': 'फोन नम्बर', 'contact.fDate': 'मिति',
      'contact.fTime': 'समय', 'contact.fGuests': 'पाहुना', 'contact.fNote': 'विशेष अनुरोध',
      'contact.optional': '(ऐच्छिक)',
      'contact.submit': 'ह्वाट्सएपमार्फत रिजर्भेसन पठाउनुहोस्',
      'contact.alt': 'कुरा गर्न चाहनुहुन्छ? <a href="tel:057522111">057-522111</a> मा कल गर्नुहोस् — हरेक कलको जवाफ दिन्छौं।',

      'footer.tag': 'प्रिमियम मल्टि-क्युजिन रेस्टो-लाउन्ज र बार। स्वादिलो खाना, उत्कृष्ट संगीत, अविस्मरणीय क्षण।',
      'footer.explore': 'अन्वेषण गर्नुहोस्', 'footer.contact': 'सम्पर्क', 'footer.hours': 'खुल्ने समय',
      'footer.hoursLine': 'सोम – आइत · बिहान ११ – राति ११ बजे',
      'footer.addr': 'हुप्रा, हेटौंडा-४, मकवानपुर, नेपाल',
      'footer.rights': '© {{year}} सुत्र लाउन्ज। सर्वाधिकार सुरक्षित।',
      'footer.love': 'हेटौंडामा माया र स्वादले बनाइएको',

      'mobile.call': 'कल', 'mobile.wa': 'ह्वाट्सएप', 'mobile.reserve': 'बुक गर्नुहोस्'
    }
  };

  /* Merge database-driven content into the EN dictionary so admin edits
     are reflected on the public site (NP translations still apply on toggle). */
  if (window.SUTRA_I18N) Object.assign(I18N.en, window.SUTRA_I18N);

  const store = {
    get: (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } }
  };

  /* ---------- 2. Language ---------- */
  const langToggle = document.getElementById('langToggle');
  const langLabel = document.getElementById('langLabel');
  let currentLang = store.get('sutra-lang', 'en');

  function applyLang(lang) {
    const dict = I18N[lang] || I18N.en;
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      let text = dict[key] || I18N.en[key] || el.textContent;
      text = text.replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
      el.textContent = text;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      let html = dict[key] || I18N.en[key] || el.innerHTML;
      html = html.replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
      el.innerHTML = html;
    });

    langToggle.classList.toggle('is-np', lang === 'np');
    langLabel.textContent = lang === 'np' ? 'EN' : 'NP';
    currentLang = lang;
    store.set('sutra-lang', lang);
    updateBsTabLabels();
    updateBsLabels();
  }

  langToggle.addEventListener('click', () => {
    applyLang(currentLang === 'en' ? 'np' : 'en');
  });

  /* ---------- 3. Theme ---------- */
  const themeToggle = document.getElementById('themeToggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    store.set('sutra-theme', theme);
  }

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  /* ---------- 4. Header scroll state + scroll-spy + back to top ---------- */
  const header = document.getElementById('header');
  const toTop = document.getElementById('toTop');
  const spyIds = ['home', 'about', 'menu', 'bestsellers', 'gallery', 'testimonials', 'visit'];
  const navAnchors = Array.from(document.querySelectorAll('.nav-list a'));

  function onSpy() {
    const marker = window.scrollY + 160;
    let current = '';
    spyIds.forEach((id) => {
      const sec = document.getElementById(id);
      if (sec && sec.offsetTop <= marker) current = id;
    });
    navAnchors.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  }

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 30);
    toTop.classList.toggle('is-visible', y > 600);
    onSpy();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onSpy, { passive: true });
  onScroll();

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 5. Mobile nav ---------- */
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');

  function closeNav() {
    nav.classList.remove('is-open');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }
  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    hamburger.classList.toggle('is-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && !hamburger.contains(e.target)) {
      closeNav();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

  /* ---------- 6. Preloader ---------- */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('is-hidden'), 350);
    setTimeout(() => (preloader.style.display = 'none'), 1200);
  });
  setTimeout(() => { preloader.classList.add('is-hidden'); preloader.style.display = 'none'; }, 4000);

  /* ---------- 7. Hero slider ---------- */
  const slides = document.querySelectorAll('.hero-slide');
  let slideIndex = 0;
  if (slides.length > 1) {
    setInterval(() => {
      slides[slideIndex].classList.remove('is-active');
      slideIndex = (slideIndex + 1) % slides.length;
      slides[slideIndex].classList.add('is-active');
    }, 6500);
  }

  /* ---------- 8. Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- 9. Video modal ---------- */
  const videoModal = document.getElementById('videoModal');
  const videoFrame = document.getElementById('videoFrame');
  const VIDEO_URL = (window.SUTRA_VIDEO && window.SUTRA_VIDEO.modal) || 'https://www.youtube.com/embed/2sRGneKpy_k?autoplay=1&rel=0';

  document.getElementById('openVideo').addEventListener('click', () => {
    videoFrame.src = VIDEO_URL;
    videoModal.classList.add('is-open');
  });
  videoModal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', () => {
      videoModal.classList.remove('is-open');
      videoFrame.src = '';
    });
  });

  /* ---------- 10. Gallery lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');

  document.querySelectorAll('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      lightboxImg.src = item.getAttribute('data-full') || img.src;
      lightboxImg.alt = img.alt;
      lightboxCaption.textContent = img.alt;
      lightbox.classList.add('is-open');
    });
  });
  lightbox.querySelectorAll('[data-close-lightbox]').forEach((el) => {
    el.addEventListener('click', () => lightbox.classList.remove('is-open'));
  });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('is-open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { lightbox.classList.remove('is-open'); videoModal.classList.remove('is-open'); videoFrame.src = ''; closeQv(); }
  });

  /* ---------- 11. Reservation form -> WhatsApp ---------- */
  const form = document.getElementById('reserveForm');
  const WA_NUMBER = (window.SUTRA_CONTACT && window.SUTRA_CONTACT.wa) || '97757522111';

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const date = form.date.value;
    const time = form.time.value;
    const guests = form.guests.value;
    const note = form.note.value.trim();

    let valid = true;
    [['name', name], ['phone', phone], ['date', date], ['time', time]].forEach(([key, val]) => {
      const input = form.elements[key];
      const field = input.closest('.form-field');
      const hasError = !val;
      input.classList.toggle('is-invalid', hasError);
      field.classList.toggle('has-error', hasError);
      if (hasError) valid = false;
    });
    if (!valid) return;

    const prettyDate = date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : date;

    const lines = [
      'Hi Sutra Lounge! I would like to reserve a table.',
      'Name: ' + name,
      'Phone: ' + phone,
      'Date: ' + prettyDate,
      'Time: ' + time,
      'Guests: ' + guests
    ];
    if (note) lines.push('Note: ' + note);

    const url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
    window.open(url, '_blank', 'noopener');
  });

  /* ---------- 12. Inline error reset ---------- */
  form.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      input.closest('.form-field').classList.remove('has-error');
    });
  });

  /* ---------- 13. Set min date to today ---------- */
  const dateInput = document.getElementById('fDate');
  const today = new Date();
  const todayISO = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  dateInput.min = todayISO;

  /* ---------- 14. Bestsellers ---------- */
  const bsCategories = [
    { id: 'all', key: 'bestsellers.tab.all' },
    { id: 'platters', key: 'bestsellers.tab.platters' },
    { id: 'snacks', key: 'bestsellers.tab.snacks' },
    { id: 'drinks', key: 'bestsellers.tab.drinks' }
  ];

  const bsCatLabel = {
    platters: 'Platters',
    snacks: 'Snacks & Pizza',
    drinks: 'Cocktails & Hookah'
  };

  const DEFAULT_BS = [
    {
      name: 'Bamboo Biryani', price: 'Rs 545', cat: 'platters', badge: 'Chef Special',
      desc: 'Slow-cooked in real bamboo with aromatic Nepali spices.',
      img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Sutra Momo Platter', price: 'Rs 495', cat: 'platters', badge: 'Must Try',
      desc: '15-piece combo of Steam, Fry, Kothey, Chilly & Crunchy Mo:mo.',
      img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Grand Indian Platter', price: 'Rs 1,495', cat: 'platters', badge: 'Group Size',
      desc: 'Tandoori chicken, seekh kebab, butter chicken, naan & pulao.',
      img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Peri Peri Chicken Pizza', price: 'Rs 795', cat: 'snacks', badge: null,
      desc: 'Loaded with spicy peri-peri chicken, melted mozzarella, and fresh veggies.',
      img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Monster Fries', price: 'Rs 495', cat: 'snacks', badge: null,
      desc: 'Loaded crispy fries topped with melted cheese and signature spicy sauces.',
      img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Creamy Espresso Martini', price: 'Rs 995', cat: 'drinks', badge: 'Signature Drink',
      desc: 'Fresh espresso shot blended with dark spirit and smooth cream.',
      img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Cloud Hookah', price: 'Rs 495', cat: 'drinks', badge: 'Lounge Favorite',
      desc: 'Premium smooth smoke available in exotic fruit flavors.',
      img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80'
    }
  ];

  /* Bestsellers come from the database (published state), injected server-side.
     Fall back to a built-in demo list if the data is missing. */
  const bsMenu = window.SUTRA_BS && window.SUTRA_BS.length ? window.SUTRA_BS : DEFAULT_BS;

  const bsFilters = document.getElementById('bsFilters');
  const bsGrid = document.getElementById('bsGrid');
  const qvModal = document.getElementById('qvModal');
  let bsActive = 'all';

  const WA_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function bsLabel(key) {
    const dict = I18N[currentLang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function updateBsTabLabels() {
    if (!bsFilters) return;
    Array.prototype.forEach.call(bsFilters.children, (btn) => {
      const cat = bsCategories.find((c) => c.id === btn.dataset.cat);
      if (cat) btn.textContent = bsLabel(cat.key);
    });
  }

  function updateBsLabels() {
    document.querySelectorAll('[data-bs-label]').forEach((el) => {
      el.textContent = bsLabel(el.getAttribute('data-bs-label'));
    });
  }

  function bsWaLink(item) {
    const msg = 'Hi Sutra Lounge! I would like to order the ' + item.name + ' (' + item.price + ').';
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
  }

  function setActiveBsTab() {
    Array.prototype.forEach.call(bsFilters.children, (btn) => {
      const isActive = btn.dataset.cat === bsActive;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
  }

  function buildBsCard(item, index) {
    const card = document.createElement('article');
    card.className = 'bs-card';
    card.style.animationDelay = index * 60 + 'ms';

    const media = document.createElement('div');
    media.className = 'bs-media';

    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => img.remove());
    media.appendChild(img);

    if (item.badge) {
      const badge = document.createElement('span');
      badge.className = 'bs-badge';
      badge.textContent = item.badge;
      media.appendChild(badge);
    }

    const chip = document.createElement('span');
    chip.className = 'bs-cat';
    chip.textContent = item.catLabel || bsCatLabel[item.cat] || '';
    media.appendChild(chip);

    card.appendChild(media);

    const body = document.createElement('div');
    body.className = 'bs-body';

    const head = document.createElement('div');
    head.className = 'bs-head';

    const title = document.createElement('h3');
    title.textContent = item.name;
    const price = document.createElement('span');
    price.className = 'bs-price';
    price.textContent = item.price;
    head.appendChild(title);
    head.appendChild(price);

    const desc = document.createElement('p');
    desc.className = 'bs-desc';
    desc.textContent = item.desc;

    const actions = document.createElement('div');
    actions.className = 'bs-actions';

    const order = document.createElement('a');
    order.className = 'btn btn-gold';
    order.href = bsWaLink(item);
    order.target = '_blank';
    order.rel = 'noopener';
    order.innerHTML = WA_SVG + '<span data-bs-label="bestsellers.order"></span>';

    const quick = document.createElement('button');
    quick.type = 'button';
    quick.className = 'btn btn-outline-gold';
    quick.dataset.bsLabel = 'bestsellers.quick';
    quick.textContent = bsLabel('bestsellers.quick');
    quick.addEventListener('click', () => openQv(item));

    actions.appendChild(order);
    actions.appendChild(quick);

    body.appendChild(head);
    body.appendChild(desc);
    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function renderBsMenu() {
    if (!bsGrid) return;
    setActiveBsTab();
    const list = bsActive === 'all' ? bsMenu : bsMenu.filter((m) => m.cat === bsActive);
    bsGrid.innerHTML = '';
    list.forEach((item, i) => bsGrid.appendChild(buildBsCard(item, i)));
  }

  function buildBsTabs() {
    if (!bsFilters) return;
    bsFilters.innerHTML = '';
    bsCategories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bs-tab';
      btn.dataset.cat = cat.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.addEventListener('click', () => {
        bsActive = cat.id;
        renderBsMenu();
      });
      bsFilters.appendChild(btn);
    });
    updateBsTabLabels();
  }

  /* ---------- Quick view modal ---------- */
  function openQv(item) {
    document.getElementById('qvImg').src = item.img;
    document.getElementById('qvImg').alt = item.name;
    document.getElementById('qvName').textContent = item.name;
    document.getElementById('qvPrice').textContent = item.price;
    document.getElementById('qvDesc').textContent = item.desc;
    const badge = document.getElementById('qvBadge');
    if (item.badge) {
      badge.textContent = item.badge;
      badge.classList.remove('is-empty');
    } else {
      badge.classList.add('is-empty');
    }
    document.getElementById('qvOrder').href = bsWaLink(item);
    qvModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeQv() {
    if (qvModal) qvModal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (qvModal) {
    qvModal.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', closeQv);
    });
  }

  /* ---------- 15. Init ---------- */
  applyTheme(store.get('sutra-theme', 'dark'));
  applyLang(currentLang);
  buildBsTabs();
  renderBsMenu();
  updateBsLabels();
})();
