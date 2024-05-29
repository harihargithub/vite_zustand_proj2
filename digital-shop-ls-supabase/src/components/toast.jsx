import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-react-buttons/styles/material.css';
import '@syncfusion/ej2-react-popups/styles/material.css';
import '@syncfusion/ej2-react-notifications/styles/material.css';
import PropTypes from 'prop-types';

const TOAST_TYPES = {
  warning: 'e-toast-warning',
  success: 'e-toast-success',
  error: 'e-toast-danger',
  info: 'e-toast-infor',
};

const Toast = ({ errorMessage, type, onClose }) => {
  let toastInstance;

  let position = { X: 'Center' };

  function toastCreated() {
    toastInstance.show();
  }

  function toastDestroyed(e) {
    e.clickToClose = true;
    onClose && onClose();
  }

  return (
    <div>
      <ToastComponent
        ref={(toast) => (toastInstance = toast)}
        title={type.toUpperCase()}
        content={errorMessage}
        position={position}
        created={toastCreated.bind(this)}
        click={toastDestroyed.bind(this)}
        showCloseButton
        cssClass={TOAST_TYPES[type] || TOAST_TYPES['info']}
      />
    </div>
  );
};
Toast.propTypes = {
  errorMessage: PropTypes.string,
  type: PropTypes.string,
  onClose: PropTypes.func,
};
export default Toast;
