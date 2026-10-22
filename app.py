from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="INIX FORECAST", page_icon="🌦️", layout="wide",
                   initial_sidebar_state="collapsed")

# Remove Streamlit's default padding/header and make the app frame fill the screen
st.markdown(
    """
    <style>
      #MainMenu, header, footer {visibility: hidden;}
      html, body, [data-testid="stAppViewContainer"], [data-testid="stMain"] {
        overflow: hidden !important;
      }
      .block-container {padding: 0 !important; max-width: 100% !important;}
      iframe {
        width: 100% !important;
        height: 100vh !important;
        height: 100dvh !important;
        border: 0 !important;
        display: block;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

html = (Path(__file__).parent / "index.html").read_text(encoding="utf-8")
components.html(html, height=900, scrolling=True)
