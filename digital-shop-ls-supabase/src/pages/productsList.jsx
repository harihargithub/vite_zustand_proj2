import "../productList.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import ProductEdit from "./productEdit";
import Modal from "../components/Modal";
import useProducts from "../../hooks/useProduct";
import productStore from "../store/products";
import DataGrid from "../components/DataGrid/index";
import PropTypes from "prop-types";

const ActionsTemplate = ({ product, setProductToEdit, setShowModal }) => {
  return (
    <span>
      <span
        onClick={() => {
          setProductToEdit(product);
          setShowModal(true);
        }}
        className="edit-product"
      >
        Edit
      </span>
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

const ProductList = () => {
  const [productToEdit, setProductToEdit] = useState({});
  const [showModal, setShowModal] = useState(false);
  useProducts();
  const productsList = productStore((state) => state.productsList);

  return (
    <div className="product-list">
      <DataGrid data={productsList}>
        {productsList.map((product) => (
          <ActionsTemplate
            key={product.id}
            product={product}
            setProductToEdit={setProductToEdit}
            setShowModal={setShowModal}
          />
        ))}
      </DataGrid>
      <Modal
        showModal={showModal}
        handleClose={() => {
          setShowModal(false);
          setProductToEdit({});
        }}
      >
        <ProductEdit product={productToEdit} />
      </Modal>
    </div>
  );
};

export default ProductList;