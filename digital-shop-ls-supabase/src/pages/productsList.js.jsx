import "./productList.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import ProductEdit from "./productEdit";
import Modal from "../components/Modal";
import useProducts from "../../hooks/useProducts";
import productStore from "../store/products";
import DataGrid from "../components/DataGrid/index"

const ProductList = () => {
  const [productToEdit, setProductToEdit] = useState({});
  const [showModal, setShowModal] = useState(false);
  useProducts();
  const productsList = productStore((state) => state.productsList);

  const ActionsTemplate = (e) => {
    const product = productsList.filter((f) => f.id === e.id)[0] || [];
    return (
      <span>
        <span
          onClick={() => {
            setProductToEdit(e);
            setShowModal(true);
          }}
          className="edit-product"
        >
          Edit
        </span>
        <Link to={`/product/${e.id}`} title={`preview ${e.Name}`}>
          Preview
        </Link>
      </span>
    );
  };

  return (
    <div className="product-list">
      <DataGrid data={productsList} ActionsTemplate={ActionsTemplate} />
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