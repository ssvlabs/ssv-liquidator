import React from 'react';
import { Text } from 'ink';
import importJsx from 'import-jsx';
import path from 'path';

const { TableComponent } = importJsx(
  path.join(__dirname, '/../../../shared/cli/table'),
);

interface IAddressesComponentProps {
  items?: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IAddressesComponentState {}

export class AddressesComponent extends React.Component<
  IAddressesComponentProps,
  IAddressesComponentState
> {
  constructor(props) {
    super(props);
  }

  render() {
    return <TableComponent data={this.props.items} />;
  }
}
