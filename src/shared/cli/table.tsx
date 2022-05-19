import * as React from 'react';
import { Box, Text } from 'ink';

interface ITableProps {
  data?: any;
  cellSpacing?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ITableState {}

export class TableComponent extends React.Component<ITableProps, ITableState> {
  constructor(props) {
    super(props);
  }

  componentDidMount() {}

  getSnapshotBeforeUpdate(prevProps) {
    return null;
  }

  componentDidUpdate() {}

  /**
   * For an array of [{ name: 'ameer', city: 'madurai' }, { name: 'bala', city: 'bengaluru' }] it returns { name: 5, city: 9 }
   * @param {*} array array of objects
   * @param {*} header key of the object for which the max length its value in the entire array is to be found
   * @returns key value pair of header and its length of its max length string in the entire array
   */
  findMaxLengthText(array, header) {
    let maxLength = header.length;

    array.forEach(element => {
      const text = new String(element[header].text);
      if (text.trim().length > maxLength) {
        maxLength = text.trim().length;
      }
    });

    return maxLength;
  }

  /**
   * Creates string with specified number of spaces
   * @param {number} noOfSpaces number spaces to be added to the empty string
   * @returns string with specified number of spaces
   */
  emptySpaces(noOfSpaces) {
    return new Array(noOfSpaces + 1).join(' ');
  }

  /**
   * if the string is **'Ameer'** and the noOfSpaces is **4** then it would return '\*\*Ameer\*\*' where each * represents a blank space
   * @param {string} string string content which is to be padded
   * @param {number} noOfSpaces number of spaces that is to be padded around the text
   */
  padAroundStringWithSpaces(string, noOfSpaces, extraSpace = 0) {
    const text = new String(string);
    const diff = noOfSpaces - text.length;
    const spaceAtOneEnd = Math.floor(diff / 2);
    const remainingSpace = diff - spaceAtOneEnd * 2;

    const paddedText = `${this.emptySpaces(
      spaceAtOneEnd + extraSpace,
    )}${text}${this.emptySpaces(spaceAtOneEnd + remainingSpace + extraSpace)}`;

    return paddedText;
  }

  /**
   * It wraps the text content with specified font and background colors
   * @param {string} content string content that is to be displayed
   * @returns string content wrapped in Color component with specified font and background colors
   */
  colorizeText(content) {
    if (content.color == undefined && content.bgColor == undefined) {
      return <Text>{content.text}</Text>;
    } else {
      const props = {};

      if (content.color != undefined) {
        props['color'] = content.color;
      }
      if (content.bgColor != undefined) {
        props['backgroundColor'] = content.bgColor;
      }
      return <Text {...props}>{content.text}</Text>;
    }
  }

  getTableHeaderTexts(data) {
    return Object.keys(data[0]);
  }

  getMaxLengthOfTextInHeaders(data) {
    const tableHeaderTexts = this.getTableHeaderTexts(data);
    const maxLengthOfTextInHeader = {};

    tableHeaderTexts.forEach(header => {
      maxLengthOfTextInHeader[header] = this.findMaxLengthText(data, header);
    });

    return maxLengthOfTextInHeader;
  }

  padAroundTableValues(data, maxLengthOfTextInHeader) {
    const dataCopy = data;
    const tableHeaderTexts = this.getTableHeaderTexts(data);

    // Pad texts with spaces if needed
    dataCopy.forEach(row => {
      tableHeaderTexts.forEach(header => {
        // Pad text specifies extra space that is to the cell
        if (row[header].padText) {
          row[header].text = this.padAroundStringWithSpaces(
            row[header].text,
            maxLengthOfTextInHeader[header],
            row[header].extraPadding,
          );
        }
      });
    });

    return dataCopy;
  }

  getTableContent(data, maxLengthOfTextInHeader, cellSpacing) {
    const paddedData = this.padAroundTableValues(data, maxLengthOfTextInHeader);
    const tableHeaderTexts = this.getTableHeaderTexts(data);

    return paddedData.map((row, rowIndex) => {
      const tableContent = [];
      tableHeaderTexts.forEach((header, columnIndex) => {
        const tableContentTextRef = this.colorizeText(row[header]);
        tableContent.push(
          <Box
            key={columnIndex}
            width={maxLengthOfTextInHeader[header] + cellSpacing}
          >
            <React.Fragment>{tableContentTextRef}</React.Fragment>
          </Box>,
        );
      });
      return <Box key={rowIndex}>{tableContent}</Box>;
    });
  }

  getTableHeader(data, maxLengthOfTextInHeader, cellSpacing) {
    const tableHeader = [];
    const tableHeaderTexts = this.getTableHeaderTexts(data);

    tableHeaderTexts.forEach((header, index) => {
      tableHeader.push(
        <Box key={index} width={maxLengthOfTextInHeader[header] + cellSpacing}>
          <Text color="green">{header.toUpperCase()}</Text>
        </Box>,
      );
    });

    return tableHeader;
  }

  render() {
    const data = this.props.data;
    const cellSpacing = this.props.cellSpacing || 5;

    if (!data || data.length == 0) {
      return <Text>no data</Text>;
    }

    const maxLengthOfTextInHeader = this.getMaxLengthOfTextInHeaders(data);
    const tableHeader = this.getTableHeader(
      data,
      maxLengthOfTextInHeader,
      cellSpacing,
    );
    const tableContent = this.getTableContent(
      data,
      maxLengthOfTextInHeader,
      cellSpacing,
    );

    return (
      <React.Fragment>
        <Box flexDirection="row">{tableHeader}</Box>
        <Box flexDirection="column">{tableContent}</Box>
      </React.Fragment>
    );
  }
}

module.exports = {
  TableComponent,
};
