import React, { Component } from 'react';
import importJsx from 'import-jsx';
import path from 'path';
import { transformAddressData } from './address.transformer';
const { AddressesComponent } = importJsx(path.join(__dirname,'/../../addresses/cli/address.component'));
const { BaseContainer } = importJsx(path.join(__dirname,'/../../../shared/cli//base.container'));

interface IAddressesProps {
  service;
}

interface IAddressesState {
}

export class Addresses extends Component<IAddressesProps, IAddressesState> {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <BaseContainer
        componentRef={AddressesComponent}
        service={this.props.service}
        transformer={transformAddressData}
      />
    );
  }
}
