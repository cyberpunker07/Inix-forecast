from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="INIX FORECAST",
    page_icon="🌦️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Force the iframe to truly fill the screen and hide Streamlit chrome
st.markdown(
    """
    <style>
      #MainMenu, header, footer, [data-testid="stHeader"], [data-testid="stToolbar"] {
        visibility: hidden !important;
        height: 0 !important;
      }
      html, body, [data-testid="stAppViewContainer"], [data-testid="stMain"],
      .block-container, .main, .stApp {
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        height: 100vh !important;
        height: 100dvh !important;
      }
      iframe {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        border: none !important;
        z-index: 9999 !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

html_path = Path(__file__).parent / "index.html"
if not html_path.exists():
    st.error(f"index.html not found next to the script: {html_path}")
    st.stop()

html = html_path.read_text(encoding="utf-8")

# Large height so content is never cropped; CSS makes the iframe full-screen
components.html(html, height=4000, scrolling=True)
