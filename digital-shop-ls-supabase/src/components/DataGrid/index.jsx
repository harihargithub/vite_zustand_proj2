import PropTypes from 'prop-types';
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-buttons/styles/material.css";
import "@syncfusion/ej2-calendars/styles/material.css";
import "@syncfusion/ej2-dropdowns/styles/material.css";
import "@syncfusion/ej2-inputs/styles/material.css";
import "@syncfusion/ej2-navigations/styles/material.css";
import "@syncfusion/ej2-popups/styles/material.css";
import "@syncfusion/ej2-splitbuttons/styles/material.css";
import "@syncfusion/ej2-notifications/styles/material.css";
import "@syncfusion/ej2-react-grids/styles/material.css";
import {
  ColumnDirective,
  ColumnsDirective,
  GridComponent,
  Inject,
  Page,
} from "@syncfusion/ej2-react-grids";

import { Link } from "react-router-dom";
import * as React from "react";

const DefaultValueTemplate = (props) => {
  return props[props.column.field] || 0;
};

DefaultValueTemplate.propTypes = {
    column: PropTypes.shape({
        field: PropTypes.string.isRequired,
    }).isRequired,
};

const ThumbnailTemplate = (props) => {
  return (
    <img
      src={props.product_thumbnail}
      alt={props.product_name}
      title={props.product_name}
      style={{ maxWidth: "50px" }}
    />
  );
};

ThumbnailTemplate.propTypes = {
    product_thumbnail: PropTypes.string.isRequired,
    product_name: PropTypes.string.isRequired,
};

const DataGrid = ({ data, ActionsTemplate }) => {
  return (
    <GridComponent
      dataSource={data}
      allowPaging={true}
      pageSettings={{ pageSize: 6 }}
    >
      <ColumnsDirective>
        <ColumnDirective
          field="product_thumbnail"
          width="120"
          textAlign="Right"
          template={ThumbnailTemplate}
          headerText="Thumbnail"
        />
        <ColumnDirective field="product_name" width="100" headerText="Name" />
        <ColumnDirective
          field="product_price"
          width="100"
          textAlign="Right"
          headerText="Price"
          template={DefaultValueTemplate}
        />
        <ColumnDirective
          field="product_sale"
          width="100"
          format="C2"
          textAlign="Right"
          headerText="Sale"
          template={DefaultValueTemplate}
        />
        <ColumnDirective
          field="product_profit"
          width="100"
          headerText="Profit"
          template={DefaultValueTemplate}
        />
        <ColumnDirective
          field="action"
          width="100"
          template={ActionsTemplate}
          headerText="Action"
        />
      </ColumnsDirective>
      <Inject services={[Page]} />
    </GridComponent>
  );
};

DataGrid.propTypes = {
  data: PropTypes.array.isRequired,
  ActionsTemplate: PropTypes.element.isRequired,
};

export default DataGrid;