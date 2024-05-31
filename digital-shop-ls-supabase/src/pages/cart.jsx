import useCartStore from '../store/cartStore';

const Cart = () => {
  const { items, setCartItems, updateCartItems, resetCart } = useCartStore();

  // Render your cart UI here. This is just a placeholder.
  return (
    <div>
      <h1>Cart</h1>
      {/* Render the items in the cart */}
      {Object.keys(items).map((key) => (
        <div key={key}>{items[key]}</div>
      ))}
      {/* Add buttons or other controls to update or reset the cart */}
      <button onClick={resetCart}>Reset Cart</button>
    </div>
  );
};

export default Cart;