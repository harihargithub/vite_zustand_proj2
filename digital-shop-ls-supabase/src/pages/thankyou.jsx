// ThankYou.jsx under src/pages folder
import { useLocation, useNavigate } from "react-router-dom";

const ThankYou = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  console.log('state:', state);

  if (!state || !state.orderId) {
    navigate("/dashboard");
    return null;
  }

  const { orderId } = state;

  return (
    <div className="checkout-wrapper">
      <div className="e-card text-center">
        <h1>Thank you for your purchase</h1>
        <span>Your order id: {orderId}</span>
      </div>
    </div>
  );
};

export default ThankYou;