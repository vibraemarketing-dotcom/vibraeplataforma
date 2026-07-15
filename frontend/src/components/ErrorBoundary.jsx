import { Component } from "react";

/**
 * Rede de proteção: se qualquer página lançar um erro de render, mostramos uma
 * mensagem amigável com o detalhe técnico (em vez de uma tela branca) e mantemos
 * o restante do app utilizável. É usado com key={pathname} no AppLayout, então
 * navegar para outra tela limpa o erro automaticamente.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Ajuda no diagnóstico via console do navegador.
    console.error("[VIBRAE] Erro na página:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message || this.state.error);
      return (
        <div
          style={{
            maxWidth: 680,
            margin: "40px auto",
            background: "#fff",
            border: "1px solid #E7E5E0",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: "0.28em", color: "#A18133" }}>OPS</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#231F20", marginTop: 8 }}>
            Algo deu errado nesta tela
          </h1>
          <p style={{ fontSize: 14, color: "#6F6F6C", marginTop: 12 }}>
            A página encontrou um erro e não pôde ser exibida. Você pode voltar para outra tela pelo
            menu ao lado, ou recarregar. Detalhe técnico:
          </p>
          <pre
            style={{
              textAlign: "left",
              background: "#FAF8F5",
              border: "1px solid #E7E5E0",
              borderRadius: 10,
              padding: 12,
              marginTop: 16,
              fontSize: 12,
              color: "#9A2A1E",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowX: "auto",
            }}
          >
            {msg}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              background: "#A18133",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
