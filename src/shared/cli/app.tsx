import React from 'react';
import importJsx from 'import-jsx';
import path from 'path';
const { Addresses } = importJsx(path.join(__dirname,'/../../modules/addresses/cli/address.container'));

interface IAppProps {
  resource: string;
  service;
}

interface IAppState {
}

export class App extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props);
  }

  getResourceComponent() {
    switch (this.props.resource) {
      case 'addresses':
        return Addresses;
      default:
        return false;
    }
  }

  render() {
    const ResourceComponent = this.getResourceComponent();
    if (ResourceComponent) {
      return (
        <React.Fragment>
          <ResourceComponent
            service={this.props.service}
          />
        </React.Fragment>
      );  
    }
  }
}
