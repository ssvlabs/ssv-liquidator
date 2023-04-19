import React from 'react';
import importJsx from 'import-jsx';
import path from 'path';
const { Clusters } = importJsx(
  path.join(__dirname, '/../../modules/clusters/cli/cluster.container'),
);
const { Earnings } = importJsx(
  path.join(__dirname, '/../../modules/earnings/cli/earning.container'),
);
const { Namespaces } = importJsx(
  path.join(__dirname, '/../../shared/cli/namespaces.container'),
);

interface IAppProps {
  resource: string;
  clusterService;
  earningService;
  web3Provider;
}

interface IAppState {
  selectedNamespace;
}

export class App extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props);
    this.state = { selectedNamespace: 'clusters' };
    this.onNamespaceChange = this.onNamespaceChange.bind(this);
  }

  onNamespaceChange(name) {
    this.setState({ selectedNamespace: name });
  }

  getResourceComponent() {
    switch (this.state.selectedNamespace) {
      case 'clusters':
        return Clusters;
      case 'earnings':
        return Earnings;
      default:
        return false;
    }
  }

  render() {
    const ResourceComponent = this.getResourceComponent();
    if (ResourceComponent) {
      return (
        <React.Fragment>
          <Namespaces onNamespaceChange={this.onNamespaceChange} />
          <ResourceComponent
            web3Provider={this.props.web3Provider}
            service={
              this.state.selectedNamespace === 'clusters'
                ? this.props.clusterService
                : this.props.earningService
            }
          />
        </React.Fragment>
      );
    }
  }
}
