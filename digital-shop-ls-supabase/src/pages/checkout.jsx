import { useRef, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextBoxComponent, MaskedTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { FormValidator } from '@syncfusion/ej2-inputs';
import useCartStore from '../store/cartStore';
import { supabase } from '../../hooks/supabase';
import '../checkout.css';
import PropTypes from 'prop-types';

const getCartTotal = (items) => {
  const itemsMapped = Object.keys(items).map((e) => items[e]);

  const cartTotal = itemsMapped.reduce((a, b) => {
    const { product_price } = b;
    return a + Number(product_price);
  }, 0);

  return cartTotal;
};

const CartDetails = () => {
  const items = useCartStore((state) => state.items);

  const itemsMapped = Object.keys(items).map((e) => {
    const item = items[e];
    return { ...item, product_price: Number(item.product_price) };
  });

  const cartTotal = getCartTotal(itemsMapped);

  const productsMapped = itemsMapped.map((e, index) => <Products item={e} key={index} />);

  return (
    <div className="product-wrapper">
      <div>{productsMapped}</div>
      <div>
        Cart Total: <strong>{cartTotal}</strong>
      </div>
    </div>
  );
};

const Products = ({ item }) => {
  // Convert product_price to a number
  item.product_price = Number(item.product_price);

  return (
    <div className="product" key={item.product_name}>
      <div>
        <img src={item.product_thumbnail} alt={item.product_name} />
      </div>
      <br />
      <div>{item.product_name}</div>
      <br />
      <div>
        Price: <strong>{item.product_price}</strong>
      </div>
    </div>
  );
};

Products.propTypes = {
  item: PropTypes.shape({
    product_name: PropTypes.string,
    product_thumbnail: PropTypes.string,
    product_price: PropTypes.number,
  }).isRequired,
};

const ShippingForm = () => {
  const navigate = useNavigate();
  const { items, resetCart } = useCartStore((state) => state);
  const userNameRef = useRef(null);

  const formObject = useRef(null);

  const initialState = {
    name: "",
    state: "",
    country: "",
    address: "",
    postal_code: "",
    phone_number: "",
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case "update":
        return { ...state, [action.field]: action.value };
      default:
        return initialState;
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const update = (field) => (event) => {
    dispatch({ type: "update", field, value: event.value });
  };

  const customFn = (args) => {
    const argsLength = args.element.ej2_instances[0].value.length;
    return argsLength >= 10;
  };

  useEffect(() => {
    userNameRef.current.focusIn();
    const options = {
      rules: {
        name: {
          required: [true, "* Please enter your full name"],
        },
        phone_number: {
          numberValue: [customFn, "* Please enter your phone number"],
        },
        address: {
          required: [true, "* Please enter your address"],
        },
        postal_code: {
          required: [true, "* Please enter your postal code"],
        },
        state: {
          required: [true, "* Please enter your state"],
        },
        country: {
          required: [true, "* Please enter your country"],
        },
      },
    };
    formObject.current = new FormValidator("#form1", options);
    if (supabase.auth.user) {
      console.log(supabase.auth.user);
    } else {
      console.log('No user is currently logged in');
    }
  }, []);

  const onSubmit = async (e) => {
  e.preventDefault();

  try {
    const { data, error: userError } = await supabase.auth.getSession();
    const { session } = data;

    const address = JSON.stringify(state);
    const products = JSON.stringify(items);
    const total = getCartTotal(items);
    const { data: orderData, error: orderError } = await supabase
      .from("order")
      .insert({
        total,
        address,
        products,
        user_id: session?.user?.id,
      })
      .select();

    if (!orderError) {
      formObject.current.element.reset();
      resetCart();
      navigate("/dashboard/thank-you", { state: { orderId: orderData[0].id } });
    }
  } catch (e) {
    console.error("Something went wrong", e);
  }
};

  return (
    <>
      <div id="container">
        <div>
          <div className="control_wrapper" id="control_wrapper">
            <h3 className="form-title">Fill in your shipping details</h3>
            <div className="control_wrapper textbox-form">
              <form id="form1" method="post">
                <div className="form-group">
                  <TextBoxComponent
                    ref={userNameRef}
                    name="name"
                    value={state.email}
                    change={update("name")}
                    placeholder="Full Name"
                    floatLabelType="Auto"
                    data-msg-containerid="errorForName"
                  />
                  <div id="errorForName" />
                </div>
                <div className="form-group">
                  <MaskedTextBoxComponent
                    mask="000-000-0000"
                    id="mask"
                    name="phone_number"
                    placeholder="Phone Number"
                    floatLabelType="Always"
                    data-msg-containerid="errorForPhone"
                    value={state.phone_number}
                    change={update("phone_number")}
                  />
                  <label className="e-error" htmlFor="phone_number" />
                </div>
                <div className="form-group">
                  <div className="e-float-input">
                    <textarea
                      className="address-field"
                      id="address"
                      name="address"
                      value={state.address}
                      onChange={update("address")}
                    />

                    <label className="e-float-text e-label-top">Address</label>
                  </div>
                </div>
                <div className="form-group">
                  <TextBoxComponent
                    type="text"
                    name="postal_code"
                    value={state.postal_code}
                    change={update("postal_code")}
                    placeholder="Postal code"
                    floatLabelType="Auto"
                    data-msg-containerid="errorForPostalCode"
                  />
                  <div id="errorForPostalCode" />
                </div>
                <div className="form-group">
                  <TextBoxComponent
                    type="text"
                    name="state"
                    value={state.state}
                    change={update("state")}
                    placeholder="State"
                    floatLabelType="Auto"
                    data-msg-containerid="errorForState"
                  />
                  <div id="errorForState" />
                </div>
                <div className="form-group">
                  <TextBoxComponent
                    type="text"
                    name="country"
                    value={state.country}
                    change={update("country")}
                    placeholder="Country"
                    floatLabelType="Auto"
                    data-msg-containerid="errorForCountry"
                  />
                  <div id="errorForCountry" />
                </div>
              </form>
              <div className="submitBtn">
                <ButtonComponent
                  cssClass="e-success e-block"
                  onClick={onSubmit}
                >
                  Submit
                </ButtonComponent>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Checkout = () => {
  return (
    <div className="checkout-wrapper">
      <main className="e-card">
        <ShippingForm />
      </main>
      <aside id="default-sidebar" className="e-card sidebar" style={{position: "right"}}>
        <CartDetails />
      </aside>
    </div>
  );
};

export default Checkout;