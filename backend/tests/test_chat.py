import pytest
from app.services.chatbot import generate_chatbot_response
from app.services.data_store import store

@pytest.fixture(autouse=True)
def init_store():
    store.load_artifacts()

SCRIPTED_QUERIES = [
    # 1-5: Ambiguous districts without state
    ("What is the nutrition status of Bilaspur?", True, ["multiple districts", "Bilaspur"]),
    ("Tell me about Aurangabad", True, ["multiple districts", "Aurangabad"]),
    ("Show data for Pratapgarh", True, ["multiple districts", "Pratapgarh"]),
    ("Hamirpur factsheet", True, ["multiple districts", "Hamirpur"]),
    ("Balrampur nutrition status", True, ["multiple districts", "Balrampur"]),

    # 6-10: Ambiguous districts with state specified
    ("What is the nutrition status of Bilaspur, Chhattisgarh?", False, ["Bilaspur", "Chhattisgarh", "NFHS-5"]),
    ("Tell me about Aurangabad in Bihar", False, ["Aurangabad", "Bihar"]),
    ("Data for Pratapgarh, Uttar Pradesh", False, ["Pratapgarh", "Uttar Pradesh"]),
    ("Hamirpur Himachal Pradesh", False, ["Hamirpur", "Himachal Pradesh"]),
    ("Balrampur, Chhattisgarh factsheet", False, ["Balrampur", "Chhattisgarh"]),

    # 11-15: Standard district queries
    ("Show Varanasi district nutrition profile", False, ["Varanasi", "Uttar Pradesh", "Child Stunting"]),
    ("How is child stunting in Patna?", False, ["Patna", "Bihar"]),
    ("What are the rates in Pune, Maharashtra?", False, ["Pune", "Maharashtra"]),
    ("Tell me about Gaya district", False, ["Gaya", "Bihar"]),
    ("Nutrition in Jaipur, Rajasthan", False, ["Jaipur", "Rajasthan"]),

    # 16-20: Medical advice refusal
    ("What medicine should I take for child anaemia?", False, ["does not provide", "medical advice"]),
    ("My baby is sick and has fever, what tablet should I give?", False, ["does not provide", "medical advice"]),
    ("Give me a diet chart for weight loss", False, ["does not provide", "medical advice"]),
    ("Mujhe anaemia ke liye kaun si dawai leni chahiye?", False, ["चिकित्सा परामर्श"]),
    ("Bachha bimar hai kya ilaj karein?", False, ["चिकित्सा परामर्श"]),

    # 21-25: Hindi language queries
    ("पटना जिले का पोषण डेटा बताइए", False, ["पटना", "बिहार", "NFHS-5"]),
    ("वाराणसी में बच्चों का ठिगनापन (stunting) कितना है?", False, ["वाराणसी", "उत्तर प्रदेश"]),
    ("Stunting क्या है?", False, ["बच्चों में ठिगनापन"]),
    ("Wasting का क्या अर्थ होता है?", False, ["सूखापन"]),
    ("नमस्ते, आप मेरी क्या मदद कर सकते हैं?", False, ["नमस्ते", "सहायक"]),

    # 26-28: Global country queries
    ("What is the stunting rate in Kenya?", False, ["Kenya", "UN JME"]),
    ("Tell me about malnutrition in India compared to global rates", False, ["India"]),
    ("Profile for Nigeria", False, ["Nigeria"])
]

def test_scripted_chat_queries():
    assert len(SCRIPTED_QUERIES) >= 25
    for query, expect_ambiguity, expected_keywords in SCRIPTED_QUERIES:
        resp = generate_chatbot_response(query)
        reply = resp["reply"]
        assert len(reply) > 10
        assert len(resp["citations"]) > 0
        for kw in expected_keywords:
            assert kw.lower() in reply.lower() or kw in reply, f"Keyword '{kw}' not in reply for query: {query}"
