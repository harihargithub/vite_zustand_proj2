//productsList.jsx under src/pages folder fetches the products from the store and displays them in a table format
import "../productList.css";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductEdit from "./productEdit";
import Modal from "../components/Modal";
import useProducts from "../../hooks/useProduct";
import productStore from "../store/products";
import DataGrid from "../components/DataGrid/index";
import PropTypes from "prop-types";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { useEffect } from "react";

const ActionsTemplate = (props) => {
  const { product } = props;
  return (
    <span>
      <Link
        to={`/product-edit/${product.id}`}
        className="edit-product"
      >
        Edit
      </Link>
      <Link to={`/product/${product.id}`} title={`preview ${product.Name}`}>
        Preview
      </Link>
    </span>
  );
};

ActionsTemplate.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    Name: PropTypes.string.isRequired,
  }).isRequired,
  setProductToEdit: PropTypes.func.isRequired,
  setShowModal: PropTypes.func.isRequired,
};



const withProductActions = (Component) => {
  const WithProductActions = (props) => {
    const { product, setProductToEdit, setShowModal } = props;
    return (
      <Component
        product={product}
        setProductToEdit={setProductToEdit}
        setShowModal={setShowModal}
      />
    );
  };

  WithProductActions.displayName = `WithProductActions(${getDisplayName(Component)})`;

  WithProductActions.propTypes = {
    product: PropTypes.shape({
      id: PropTypes.number.isRequired,
      Name: PropTypes.string.isRequired,
    }).isRequired,
    setProductToEdit: PropTypes.func.isRequired,
    setShowModal: PropTypes.func.isRequired,
  };

  return WithProductActions;
};

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

const ProductActions = withProductActions(ActionsTemplate);

const ProductList = () => {
  const [productToEdit, setProductToEdit] = useState({});
  const [showModal, setShowModal] = useState(false);
  const targetElement = useRef(null);

  useProducts();
  const productsList = productStore((state) => state.productsList).map(product => ({
    ...product,
    Name: product.Name || 'Default Name',
    product_price: Number(product.product_price)
  }));
  useEffect(() => {
    console.log('Products List:', productsList);
  }, [productsList]);

  return (
    <div className="product-list" ref={targetElement}>
      <DataGrid
  key={productsList.length} // Add this line
  data={productsList}
  ActionsTemplate={(product) => <ProductActions product={product} setProductToEdit={setProductToEdit} setShowModal={setShowModal} />}
/>
      {showModal && targetElement.current && (
        <DialogComponent target={targetElement.current}>
          <Modal
            showModal={showModal}
            handleClose={() => {
              setShowModal(false);
              setProductToEdit({});
            }}
          >
            <ProductEdit product={productToEdit} />
          </Modal>
        </DialogComponent>
      )}
    </div>
  );
};

export default ProductList;

/* The `ProductList` component is designed to display products in a table format. It uses the `DataGrid` component to create the table. 

The `productsList` array is passed as the `data` prop to the `DataGrid` component. Each object in the `productsList` array represents a row in the table, and the properties of the object represent the cells in the row.

The `ActionsTemplate` prop is a function that returns a `ProductActions` component. This component provides the "Edit" and "Preview" actions for each product.

When the "Edit" action is clicked, the `setProductToEdit` function is called with the current product, and the `setShowModal` function is called with `true` to show the modal. The modal contains a `ProductEdit` component, which allows the user to edit the product.

When the modal is closed, the `setShowModal` function is called with `false` to hide the modal, and the `setProductToEdit` function is called with an empty object to clear the product to edit.

So, in summary, yes, the `ProductList` component displays the products in a table format, with "Edit" and "Preview" actions for each product. */