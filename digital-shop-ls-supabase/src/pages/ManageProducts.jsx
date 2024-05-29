// ManageProducts.jsx under src/pages folder
import { useState } from "react";
import Wrapper from '../components/Wrapper';
import "@syncfusion/ej2-react-buttons/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import "../../src/manageProduct.css";
import Modal from "../components/Modal";
import ProductAdd from "./productAdd";

const ManageProducts = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <Wrapper>
      <div className="manage-products">
        <div className="add-product">
          <ButtonComponent
            cssClass="e-info"
            onClick={() => {
              setShowModal(true);
            }}
            style={{ fontSize: "1.2em" }}
          >
            Add new product
          </ButtonComponent>
        </div>
        <Modal
          showModal={showModal}
          handleClose={() => {
            setShowModal(false);
          }}
        >
          <ProductAdd />
        </Modal>
      </div>
    </Wrapper>
  );
};

export default ManageProducts;