import { Component } from "react";
import { ErrorNotice } from "./LoadState";

export default class CardBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={this.props.className}>
        <ErrorNotice
          message={`The ${this.props.what ?? "section"} couldn't be displayed.`}
          onRetry={() => this.setState({ error: null })}
        />
      </div>
    );
  }
}
