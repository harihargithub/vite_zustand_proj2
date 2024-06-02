import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../hooks/supabase'; 
import useCartStore from '../store/cartStore'; 

const CheckoutForm = () => {
  const navigate = useNavigate();
  const { items: cartItems, resetCart } = useCartStore();
  const [address, setAddress] = useState('');

  const getCartTotal = (items) => {
    return Object.values(items).reduce((total, item) => total + item.price, 0);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data, error: userError } = await supabase.auth.session();
      const { session } = data;

      const products = JSON.stringify(cartItems);
      const total = getCartTotal(cartItems);
      const { data: orderData, error: orderError } = await supabase
        .from("order")
        .insert({
          total,
          address,
          products,
          user_id: session?.user?.id,
        })
        .single();

      if (!orderError) {
        resetCart();
        navigate("/thank-you", { state: { orderId: orderData.id } });
      }
    } catch (e) {
      console.error("Something went wrong", e);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <label>
        Address:
        <input type="text" value={address} onChange={e => setAddress(e.target.value)} required />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
};

export default CheckoutForm;