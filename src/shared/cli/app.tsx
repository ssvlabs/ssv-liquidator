import React from 'react';
import importJsx from 'import-jsx';
import path from 'path';
const { Addresses } = importJsx(path.join(__dirname,'/../../modules/addresses/cli/address.container'));
const { Earnings } = importJsx(path.join(__dirname,'/../../modules/earnings/cli/earning.container'));
const { Namespaces } = importJsx(path.join(__dirname,'/../../shared/cli/namespaces.container'));

interface IAppProps {
  resource: string;
  addressService;
  earningService;
}

interface IAppState {
  selectedNamespace;
}

export class App extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props);
    this.state = { selectedNamespace: 'addresses' };
    this.onNamespaceChange = this.onNamespaceChange.bind(this);
  }

  onNamespaceChange(name) {
    this.setState({ selectedNamespace: name });
  }

  getResourceComponent() {
    switch (this.state.selectedNamespace) {
      case 'addresses':
        return Addresses;
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
            service={this.state.selectedNamespace === 'addresses'
              ? this.props.addressService
              : this.props.earningService}
          />
        </React.Fragment>
      );  
    }
  }
}
