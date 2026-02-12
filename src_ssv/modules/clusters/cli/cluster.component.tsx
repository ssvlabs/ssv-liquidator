import React from 'react';
import importJsx from 'import-jsx';
import path from 'path';

const { TableComponent } = importJsx(
  path.join(__dirname, '/../../../shared/cli/table'),
);

interface IClustersComponentProps {
  items?: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IClustersComponentState {}

export class ClustersComponent extends React.Component<
  IClustersComponentProps,
  IClustersComponentState
> {
  constructor(props) {
    super(props);
  }

  render() {
    return <TableComponent data={this.props.items} />;
  }
}
