"""Expertium: flujo de 4 agentes (salidas simuladas por ahora)."""
import streamlit as st

from ledger import append_event, verify_chain, list_events

STEPS = ["1. No conformidad", "2. Knowledge", "3. Quality", "4. CAPA", "5. Expediente"]

SIMULATED = {
    "knowledge": {"causa_probable": "SIMULADO: descalibracion del sensor X",
                  "documentos": ["MAN-012", "PROC-034"]},
    "quality": {"riesgo": "SIMULADO: medio", "requiere_capa": True,
                "justificacion": "Tendencia repetida en 3 lotes."},
    "capa": {"acciones": ["Recalibrar sensor", "Reentrenar turno B"],
             "responsable": "SIMULADO: J. Ruiz", "plazo_dias": 14},
}

if "step" not in st.session_state:
    st.session_state.step = 0
if "nc" not in st.session_state:
    st.session_state.nc = ""
if "aprobado" not in st.session_state:
    st.session_state.aprobado = False

st.title("Expertium (esqueleto)")
st.caption("Flujo Knowledge > Quality > CAPA > Audit. Salidas simuladas.")
st.progress((st.session_state.step + 1) / len(STEPS))
step = st.radio("Paso", STEPS, index=st.session_state.step, horizontal=True)
st.session_state.step = STEPS.index(step)

if st.session_state.step == 0:
    st.header("1. No conformidad")
    st.session_state.nc = st.text_area("Describe la no conformidad",
                                       value=st.session_state.nc)
    if st.button("Guardar y continuar"):
        if st.session_state.nc.strip():
            append_event("audit", "alta_nc", st.session_state.nc.strip())
            st.session_state.step = 1
            st.rerun()
        else:
            st.warning("Escribe una descripcion primero.")

elif st.session_state.step == 1:
    st.header("2. Knowledge (simulado)")
    st.write(f"Entrada: {st.session_state.nc or '(vacia)'}")
    st.json(SIMULATED["knowledge"])
    if st.button("Aceptar y continuar"):
        append_event("knowledge", st.session_state.nc, str(SIMULATED["knowledge"]))
        st.session_state.step = 2
        st.rerun()

elif st.session_state.step == 2:
    st.header("3. Quality (simulado)")
    st.json(SIMULATED["quality"])
    if st.button("Aceptar y continuar"):
        append_event("quality", str(SIMULATED["knowledge"]), str(SIMULATED["quality"]))
        st.session_state.step = 3
        st.rerun()

elif st.session_state.step == 3:
    st.header("4. CAPA (simulado, requiere aprobacion humana)")
    st.json(SIMULATED["capa"])
    st.session_state.aprobado = st.checkbox(
        "He revisado y apruebo este plan CAPA", value=st.session_state.aprobado)
    if st.button("Continuar al expediente"):
        if st.session_state.aprobado:
            append_event("capa", str(SIMULATED["quality"]), str(SIMULATED["capa"]))
            st.session_state.step = 4
            st.rerun()
        else:
            st.warning("Debes aprobar el plan antes de continuar.")

else:
    st.header("5. Expediente")
    st.write(f"**NC:** {st.session_state.nc}")
    st.write(f"**Aprobado por humano:** {st.session_state.aprobado}")
    st.subheader("Cadena de custodia")
    ok = verify_chain()
    st.write(f"verify_chain: {'OK' if ok else 'FALLO'}")
    st.json(list_events())
    if st.button("Volver al inicio"):
        st.session_state.step = 0
        st.rerun()
