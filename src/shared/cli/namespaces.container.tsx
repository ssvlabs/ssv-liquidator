import path from 'path';
import React from 'react';
import importJsx from 'import-jsx';
const { NamespacesComponent } = importJsx(
  path.join(__dirname, '/../../shared/cli/namespaces.component'),
);

interface INamespacesProps {
  onNamespaceChange;
}

interface INamespacesState {
  namespaces;
}

export class Namespaces extends React.Component<
  INamespacesProps,
  INamespacesState
> {
  constructor(props) {
    super(props);
    this.state = { namespaces: ['addresses', 'earnings'] };
  }

  componentDidMount() {
    this.props.onNamespaceChange(this.state.namespaces[0]);
  }

  render() {
    return (
      <NamespacesComponent
        onNamespaceChange={this.props.onNamespaceChange}
        namespaces={this.state.namespaces}
      />
    );
  }
}

module.exports = {
  Namespaces,
};
