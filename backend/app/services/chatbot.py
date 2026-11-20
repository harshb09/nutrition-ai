import re
from typing import Any
import rapidfuzz
from app.services.data_store import store

# Ambiguous districts that exist in multiple states
AMBIGUOUS_DISTRICTS = {
    "aurangabad": ["Bihar", "Maharashtra"],
    "balrampur": ["Chhattisgarh", "Uttar Pradesh"],
    "bijapur": ["Chhattisgarh", "Karnataka"],
    "bilaspur": ["Chhattisgarh", "Himachal Pradesh"],
    "chandel": ["Manipur", "Mizoram"],
    "hamirpur": ["Himachal Pradesh", "Uttar Pradesh"],
    "pratapgarh": ["Rajasthan", "Uttar Pradesh"],
    "raigarh": ["Chhattisgarh", "Maharashtra"],
}

MEDICAL_KEYWORDS = [
    "medicine", "tablet", "pill", "cure", "treat", "prescription", "dose",
    "doctor", "sick", "illness", "disease", "pain", "fever", "symptom",
    "treatment", "heal", "diet chart", "diet plan", "my baby is sick",
    "dawa", "ilaj", "davai", "bimari", "bimar", "khurak", "treatment chahiye"
]

INDICATOR_GLOSSARY_EN = {
    "stunting": (
        "Child Stunting refers to children under 5 years whose height is significantly below the expected "
        "range for their age (more than 2 standard deviations below the WHO child growth standard). "
        "It reflects chronic or long-term undernutrition and recurrent infections during early childhood."
    ),
    "wasting": (
        "Child Wasting refers to children under 5 years whose weight is too low for their height. "
        "It indicates acute or recent nutritional deficit or illness and requires prompt attention."
    ),
    "underweight": (
        "Child Underweight measures children under 5 whose weight is below the expected range for their age. "
        "It combines aspects of both chronic (stunting) and acute (wasting) undernutrition."
    ),
    "anaemia_children": (
        "Child Anaemia measures children aged 6–59 months with haemoglobin levels below 11.0 g/dl. "
        "It is commonly linked to iron deficiency, parasitic infections, and dietary inadequacy."
    ),
    "anaemia_women": (
        "Maternal Anaemia measures women aged 15–49 years with haemoglobin levels below 12.0 g/dl. "
        "Anaemia in women impacts energy levels, immunity, and pregnancy outcomes."
    ),
    "low_bmi_women": (
        "Low BMI in Women measures women aged 15–49 with a Body Mass Index below 18.5 kg/m², "
        "indicating adult chronic energy deficiency or thinness."
    ),
    "overweight_women": (
        "Overweight or Obesity in Women measures women aged 15–49 with a BMI of 25.0 kg/m² or higher, "
        "which increases the risk of metabolic and cardiovascular conditions."
    )
}

INDICATOR_GLOSSARY_HI = {
    "stunting": (
        "बच्चों में ठिगनापन (Stunting) 5 वर्ष से कम आयु के उन बच्चों को दर्शाता है जिनकी लंबाई उनकी उम्र के अनुसार "
        "मानक से कम है। यह दीर्घकालिक कुपोषण और बार-बार होने वाली बीमारियों का संकेत है।"
    ),
    "wasting": (
        "बच्चों में सूखापन (Wasting) 5 वर्ष से कम आयु के उन बच्चों को दर्शाता है जिनका वजन उनकी लंबाई के अनुसार कम है। "
        "यह हाल ही में हुए गंभीर पोषण की कमी या बीमारी को दर्शाता है।"
    ),
    "underweight": (
        "कम वजन (Underweight) 5 वर्ष से कम आयु के बच्चों में उम्र के अनुसार कम वजन को मापता है।"
    ),
    "anaemia_children": (
        "बच्चों में रक्ताल्पता (एनीमिया) 6 से 59 महीने के उन बच्चों का प्रतिशत है जिनमें हीमोग्लोबिन स्तर 11.0 g/dl से कम है।"
    ),
    "anaemia_women": (
        "महिलाओं में एनीमिया 15 से 49 वर्ष की उन महिलाओं का प्रतिशत है जिनमें हीमोग्लोबिन स्तर 12.0 g/dl से कम है।"
    ),
    "low_bmi_women": (
        "महिलाओं में कम बीएमआई 18.5 kg/m² से कम बीएमआई को दर्शाता है, जो कम पोषण और दुर्बलता का संकेत है।"
    ),
    "overweight_women": (
        "महिलाओं में अधिक वजन (BMI ≥ 25 kg/m²) उन महिलाओं को दर्शाता है जिनका वजन सामान्य से अधिक है।"
    )
}

def is_hindi(text: str) -> bool:
    """Detects whether user prompt contains Devanagari script or explicit Hindi keywords."""
    if re.search(r"[\u0900-\u097F]", text):
        return True
    hi_keywords = [
        "kya", "kaise", "batao", "bataiye", "zila", "rajya", "namaste", "madad",
        "mujhe", "chahiye", "dawai", "dawa", "ilaj", "bimari", "bimar", "bachha",
        "karein", "liye", "hai", "kaun", "kitna", "kitni"
    ]
    text_words = set(re.findall(r"\w+", text.lower()))
    matches = text_words.intersection(hi_keywords)
    return len(matches) >= 2 or any(k in matches for k in ["chahiye", "batao", "bataiye", "namaste"])


def check_medical_query(text: str) -> bool:
    """Detects requests for clinical advice or treatment."""
    t = text.lower()
    return any(k in t for k in MEDICAL_KEYWORDS)

DEVANAGARI_TRANSLITERATIONS = {
    "पटना": "Patna",
    "वाराणसी": "Varanasi",
    "पुणे": "Pune",
    "जयपुर": "Jaipur",
    "गया": "Gaya",
    "दिल्ली": "Delhi",
    "लखनऊ": "Lucknow",
    "कानपुर": "Kanpur",
    "आगरा": "Agra",
    "प्रयागराज": "Prayagraj",
    "इलाहाबाद": "Allahabad",
    "मेरठ": "Meerut",
    "बरेली": "Bareilly",
    "गाजियाबाद": "Ghaziabad",
    "गोरखपुर": "Gorakhpur",
    "बिलासपुर": "Bilaspur",
    "औरंगाबाद": "Aurangabad",
    "प्रतापगढ़": "Pratapgarh",
    "हमीरपुर": "Hamirpur",
    "बलरामपुर": "Balrampur",
    "बिहार": "Bihar",
    "उत्तर प्रदेश": "Uttar Pradesh",
    "महाराष्ट्र": "Maharashtra",
    "राजस्थान": "Rajasthan",
    "मध्य प्रदेश": "Madhya Pradesh",
    "गुजरात": "Gujarat",
    "पश्चिम बंगाल": "West Bengal",
    "तमिलनाडु": "Tamil Nadu",
    "कर्नाटक": "Karnataka",
    "केरल": "Kerala",
    "पंजाब": "Punjab",
    "हरियाणा": "Haryana",
    "ओडिशा": "Odisha",
    "असम": "Assam",
    "झारखंड": "Jharkhand",
    "छत्तीसगढ़": "Chhattisgarh",
    "उत्तराखंड": "Uttarakhand",
    "हिमाचल प्रदेश": "Himachal Pradesh"
}

def parse_entities(message: str) -> dict[str, Any]:
    """Identifies mentioned districts, states, countries, and indicators."""
    msg = message.lower()

    # Transliterate known Devanagari place names into Latin
    for dev, lat in DEVANAGARI_TRANSLITERATIONS.items():
        if dev in message:
            msg += f" {lat.lower()} "
    
    # 1. State detection
    matched_state = None
    all_states = [s["state"] for s in store.get_india_states()]
    for s in all_states:
        if s.lower() in msg:
            matched_state = s
            break
            
    # 2. District detection
    matched_district = None
    ambiguity_notice = None
    
    # Check ambiguous districts first
    for amb_dist, states_list in AMBIGUOUS_DISTRICTS.items():
        if amb_dist in msg:
            if matched_state:
                # Disambiguate if state mentioned
                for st in states_list:
                    if st.lower() in matched_state.lower():
                        matched_district = amb_dist.title()
                        matched_state = st
                        break
            if not matched_district:
                ambiguity_notice = (amb_dist.title(), states_list)
                matched_district = amb_dist.title()
            break
            
    # Check general district match
    if not matched_district:
        all_dists = sorted(store.india_districts_by_state_dist.values(), key=lambda d: len(d["district"]), reverse=True)
        for d in all_dists:
            d_name = d["district"].lower()
            if len(d_name) > 3 and re.search(r"\b" + re.escape(d_name) + r"\b", msg):
                matched_district = d["district"]
                if not matched_state:
                    matched_state = d["state"]
                break

    # 3. Country detection
    matched_country = None
    sorted_countries = sorted(store.countries, key=lambda c: len(c["country_name"]), reverse=True)
    for c in sorted_countries:
        c_name = c["country_name"].lower()
        if len(c_name) > 3 and re.search(r"\b" + re.escape(c_name) + r"\b", msg):
            matched_country = c
            break

    # 4. Indicator detection
    matched_indicator = None
    for ind_key in INDICATOR_GLOSSARY_EN:
        clean_key = ind_key.replace("_", " ")
        if clean_key in msg or ind_key in msg:
            matched_indicator = ind_key
            break
    if not matched_indicator:
        if "stunt" in msg: matched_indicator = "stunting"
        elif "waste" in msg: matched_indicator = "wasting"
        elif "underweight" in msg: matched_indicator = "underweight"
        elif "anemia" in msg or "anaemia" in msg: matched_indicator = "anaemia_children"
        elif "bmi" in msg: matched_indicator = "low_bmi_women"
        elif "obese" in msg or "overweight" in msg: matched_indicator = "overweight_women"

    return {
        "state": matched_state,
        "district": matched_district,
        "ambiguity": ambiguity_notice,
        "country": matched_country,
        "indicator": matched_indicator
    }

def format_band_plain(band: str, hi: bool = False) -> str:
    if band == "higher_than_most":
        return "देश के अधिकांश जिलों से अधिक (Higher than most)" if hi else "Higher than most districts"
    elif band == "lower_than_most":
        return "देश के अधिकांश जिलों से कम (Lower than most)" if hi else "Lower than most districts"
    return "औसत के करीब (About typical)" if hi else "About typical"

def generate_chatbot_response(message: str) -> dict[str, Any]:
    """Generates grounded factual answers in English or Hindi with mandatory citations."""
    # Length guard
    if len(message) > 500:
        return {
            "reply": "Your question is too long. Please shorten your question to under 500 characters.",
            "citations": []
        }

    hi = is_hindi(message)

    # Medical safety guard
    if check_medical_query(message):
        if hi:
            reply = (
                "यह प्लेटफ़ॉर्म राष्ट्रीय परिवार स्वास्थ्य सर्वेक्षण (NFHS-5, 2019-21) के सांख्यिकीय आंकड़े प्रदान करता है। "
                "यह व्यक्तिगत चिकित्सा परामर्श, निदान या आहार योजना (डाइट चार्ट) प्रदान नहीं करता है। "
                "चिकित्सा या पोषण सहायता के लिए कृपया अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC), "
                "सामुदायिक स्वास्थ्य केंद्र (CHC), या स्थानीय आंगनवाड़ी कार्यकर्ता अथवा आशा (ASHA) से संपर्क करें।"
            )
        else:
            reply = (
                "This platform provides population-level survey statistics from NFHS-5 (2019–2021) and does not provide "
                "individual medical advice, clinical diagnoses, or personalized diet prescriptions. "
                "For healthcare and nutrition guidance, please consult your nearest Primary Health Centre (PHC), "
                "Community Health Centre (CHC), or speak to your local Anganwadi worker or ASHA."
            )
        return {
            "reply": reply,
            "citations": ["Ministry of Health and Family Welfare, Government of India (Guidance on Local Health Services)"]
        }

    entities = parse_entities(message)
    state = entities["state"]
    district = entities["district"]
    ambiguity = entities["ambiguity"]
    country = entities["country"]
    indicator = entities["indicator"]

    # 1. District Ambiguity Handling
    if ambiguity and not state:
        dist_name, states_list = ambiguity
        st_joined = " or ".join(states_list)
        if hi:
            reply = (
                f"भारत में '{dist_name}' नाम से एक से अधिक जिले हैं: {st_joined}। "
                f"कृपया स्पष्ट करें कि आप किस राज्य के {dist_name} जिले के बारे में जानना चाहते हैं?"
            )
        else:
            reply = (
                f"There are multiple districts named '{dist_name}' in India ({st_joined}). "
                f"Please specify which state's {dist_name} you would like information for."
            )
        return {
            "reply": reply,
            "citations": ["NFHS-5 (2019-21) District Factsheets"]
        }

    # 2. District Facts Lookup
    if district and state:
        try:
            d = store.get_district_detail(state, district)
            inds = d.get("indicators", {})
            stunt = inds.get("stunting", {})
            waste = inds.get("wasting", {})
            uwt = inds.get("underweight", {})
            anaem_c = inds.get("anaemia_children", {})
            anaem_w = inds.get("anaemia_women", {})
            
            stunt_val = stunt.get("value", "N/A")
            waste_val = waste.get("value", "N/A")
            anaem_c_val = anaem_c.get("value", "N/A")
            anaem_w_val = anaem_w.get("value", "N/A")

            grp_name = d.get("group_name", "District Group")
            grp_desc = d.get("group_descriptor", "")

            # Reverse transliterate for Hindi representation
            rev_map = {v.lower(): k for k, v in DEVANAGARI_TRANSLITERATIONS.items()}
            hi_dist = rev_map.get(d['district'].lower(), d['district'])
            hi_state = rev_map.get(d['state'].lower(), d['state'])

            if hi:
                reply = (
                    f"**{hi_dist} / {d['district']} ({hi_state} / {d['state']}) का पोषण प्रोफ़ाइल (NFHS-5 2019–21):**\n\n"
                    f"• **पोषण समूह:** {grp_name} ({grp_desc})\n"
                    f"• **बच्चों में ठिगनापन (Stunting):** {stunt_val}% ({format_band_plain(stunt.get('band'), hi=True)}; राज्य औसत: {stunt.get('state_average', '—')}%)\n"
                    f"• **बच्चों में सूखापन (Wasting):** {waste_val}%\n"
                    f"• **बच्चों में एनीमिया (Anaemia):** {anaem_c_val}%\n"
                    f"• **महिलाओं में एनीमिया (Anaemia):** {anaem_w_val}%\n\n"
                    f"आप 'My District' पृष्ठ पर जाकर विस्तृत आंकड़े देख सकते हैं या इस जिले की 1-पेज पीडीएफ रिपोर्ट डाउनलोड कर सकते हैं।"
                )
            else:
                reply = (
                    f"**Nutrition Profile for {d['district']}, {d['state']} (NFHS-5, 2019–2021):**\n\n"
                    f"• **Nutrition Pattern:** {grp_name} (*{grp_desc}*)\n"
                    f"• **Child Stunting:** {stunt_val}% ({format_band_plain(stunt.get('band'))}; State Average: {stunt.get('state_average', '—')}%\n"
                    f"• **Child Wasting:** {waste_val}%\n"
                    f"• **Child Anaemia (6-59m):** {anaem_c_val}%\n"
                    f"• **Anaemia in Women (15-49y):** {anaem_w_val}%\n\n"
                    f"You can view complete local context on the 'My District' page or download the official single-page summary PDF."
                )
            return {
                "reply": reply,
                "citations": [
                    "National Family Health Survey (NFHS-5, 2019–2021), Ministry of Health and Family Welfare, Government of India"
                ],
                "district_id": d.get("district_id"),
                "state": d.get("state"),
                "district": d.get("district")
            }
        except Exception:
            pass

    # 3. Country Facts Lookup
    if country:
        c_name = country.get("country_name")
        c_grp = country.get("group_name")
        stunt = country.get("stunting")
        ovwt = country.get("child_overweight")
        waste = country.get("wasting")
        obese = country.get("adult_obesity")
        diab = country.get("adult_diabetes")
        anaem = country.get("anaemia_women")

        if hi:
            reply = (
                f"**{c_name} का पोषण प्रोफ़ाइल (UN JME / WHO 2024):**\n\n"
                f"• **समूह:** {c_grp}\n"
                f"• **बच्चों में ठिगनापन (Stunting):** {stunt if stunt is not None else 'उपलब्ध नहीं'}%\n"
                f"• **बच्चों में अधिक वजन (Overweight):** {ovwt if ovwt is not None else 'उपलब्ध नहीं'}%\n"
                f"• **बच्चों में सूखापन (Wasting):** {waste if waste is not None else 'उपलब्ध नहीं'}%\n"
                f"• **वयस्क मोटापा (Adult Obesity):** {obese if obese is not None else 'उपलब्ध नहीं'}%\n"
                f"• **महिलाओं में एनीमिया:** {anaem if anaem is not None else 'उपलब्ध नहीं'}%\n\n"
                f"विश्लेषण अनुभाग (Analysis -> Country Profile) में इस देश का पूर्ण विवरण उपलब्ध है।"
            )
        else:
            reply = (
                f"**Global Profile for {c_name} (UN JME / WHO 2024 estimates):**\n\n"
                f"• **Assigned Group:** {c_grp}\n"
                f"• **Child Stunting:** {f'{stunt}%' if stunt is not None else 'Not reported'}\n"
                f"• **Child Overweight:** {f'{ovwt}%' if ovwt is not None else 'Not reported'}\n"
                f"• **Child Wasting:** {f'{waste}%' if waste is not None else 'Not reported'}\n"
                f"• **Adult Obesity:** {f'{obese}%' if obese is not None else 'Not reported'}\n"
                f"• **Women Anaemia:** {f'{anaem}%' if anaem is not None else 'Not reported'}\n\n"
                f"View the interactive Target Simulator and peer comparisons under Analysis -> Country Profile."
            )
        return {
            "reply": reply,
            "citations": [
                "UNICEF / WHO / World Bank Joint Child Malnutrition Estimates (JME 2024 edition)",
                "WHO Global Health Observatory"
            ]
        }

    # 4. Indicator Explanation
    if indicator:
        glossary = INDICATOR_GLOSSARY_HI if hi else INDICATOR_GLOSSARY_EN
        expl = glossary.get(indicator, "Indicator explanation not available.")
        title = indicator.replace("_", " ").title()
        if hi:
            reply = f"**{title} की परिभाषा एवं महत्व:**\n\n{expl}\n\nडेटा स्रोत: राष्ट्रीय परिवार स्वास्थ्य सर्वेक्षण (NFHS-5 2019-21)।"
        else:
            reply = f"**Understanding {title}:**\n\n{expl}\n\nData source: National Family Health Survey (NFHS-5, 2019-21)."
        return {
            "reply": reply,
            "citations": ["WHO Child Growth Standards and NFHS-5 Survey Factsheet Guidelines"]
        }

    # 5. General Greeting & App Help
    if hi:
        reply = (
            "नमस्ते! मैं न्यूट्रिशन एटलस (Nutrition Atlas) सहायक हूँ।\n\n"
            "मैं आपकी निम्न विषयों में मदद कर सकता हूँ:\n"
            "1. किसी भी भारतीय जिले का पोषण प्रोफ़ाइल जानना (उदा. *'पटना का पोषण डेटा'* या *'वाराणसी में स्टंटिंग'*)\n"
            "2. किसी देश का वैश्विक डेटा देखना (उदा. *'India'* या *'Nigeria'*)\n"
            "3. पोषण संकेतकों को समझना (उदा. *'Stunting क्या है?'* या *'Wasting का अर्थ'*)\n\n"
            "आप क्या जानना चाहते हैं?"
        )
    else:
        reply = (
            "Hello! I am the Nutrition Atlas assistant.\n\n"
            "I can help you explore:\n"
            "1. Any Indian district's nutrition indicators from NFHS-5 (e.g. *'Show me Varanasi'* or *'Pune stunting rate'*)\n"
            "2. Global country malnutrition profiles from UN JME (e.g. *'Profile for Kenya'*)\n"
            "3. Explanations of nutritional indicators (e.g. *'What is stunting?'* or *'Define wasting'*)\n"
            "4. Finding similar districts across India sharing a specific nutrition pattern.\n\n"
            "How can I assist you today?"
        )

    return {
        "reply": reply,
        "citations": [
            "National Family Health Survey (NFHS-5, 2019-21)",
            "UNICEF/WHO/World Bank Joint Child Malnutrition Estimates (2024)"
        ]
    }
