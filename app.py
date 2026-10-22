from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="INIX FORECAST", page_icon="🌦️", layout="wide",
                   initial_sidebar_state="collapsed")

# Remove Streamlit's default padding/header so the app fills the page
st.markdown(
    """
    <style>
      #MainMenu, header, footer {visibility: hidden;}
      .block-container {padding: 0 !important; max-width: 100% !important;}
    </style>
    """,
    unsafe_allow_html=True,
)

html = (Path(__file__).parent / "index.html").read_text(encoding="utf-8")
components.html(html, height=1000, scrolling=True)
