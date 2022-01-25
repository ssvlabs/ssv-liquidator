import React, { Component } from 'react';
import importJsx from 'import-jsx';
import path from 'path';
import { Text } from 'ink';

import { transformAddressData } from './address.transformer';
const { AddressesComponent } = importJsx(path.join(__dirname,'/../../addresses/cli/address.component'));
interface IAddressesProps {
  service;
}

interface IAddressesState {
  items?: any;
  err?: string;
}

export class Addresses extends Component<IAddressesProps, IAddressesState> {
  private timer;
  private willComponentUnmount: boolean;

  constructor(props) {
    super(props);
    this.state = { items: [], err: '' };
    this.timer;
    this.willComponentUnmount = false;
  }

  setStateSafely(state) {
    if (!this.willComponentUnmount) {
      this.setState(state);
    }
  }

  async componentDidMount() {
    await this.listenForChanges();
  }
  
  async componentWillUnmount() {
    this.willComponentUnmount = true;
    clearInterval(this.timer);
  }

  async listenForChanges() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(async() => {
      if (this.willComponentUnmount) return;
      const items = await this.props.service.findAll();
      const currentBlockNumber = await this.props.service.currentBlockNumber();
      const minimumBlocksBeforeLiquidation = await this.props.service.minimumBlocksBeforeLiquidation();
      this.setStateSafely({
        items: transformAddressData(items, { currentBlockNumber, minimumBlocksBeforeLiquidation })
      });
    }, 1000);
  }

  render() {
    if (!this.state.err) {
      return (
        <AddressesComponent items={this.state.items}/>
      );
    } else {
      return (
        <Text color="red">
          {this.state.err}
        </Text>
      );
    }
  }
}