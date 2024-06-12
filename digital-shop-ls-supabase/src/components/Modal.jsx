//Modal.jsx under src/components folder
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import "@syncfusion/ej2-react-popups/styles/material.css";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import PropTypes from "prop-types";

const Modal = ({ showModal, handleClose, children }) => {
  const dialogClose = () => {
    handleClose();
  };

  return (
    <div className="modal" id="dialog-target">
      <DialogComponent
        width="99%"
        height= "80%"
        close={dialogClose}
        header="**Fill the product details"
        target={"#main-area"}
        visible={!!showModal}
        showCloseIcon={true}
        position={{ X: "center", Y: "center" }}
      >
        {children}
      </DialogComponent>
    </div>
  );
};

Modal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default Modal;