import axios from 'axios';
import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0, itemCount: 0 });
  const [view, setView] = useState('products');
  const [customer, setCustomer] = useState({ name: '', email: '' });
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProducts();
    getCart();
  }, []);

  const getProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
    } catch (error) {
      console.log('Error getting products');
    }
  };

  const getCart = async () => {
    try {
      const response = await axios.get(`${API_BASE}/cart`);
      setCart(response.data);
    } catch (error) {
      console.log('Error getting cart');
    }
  };

  const addToCart = async (productId) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/cart`, { productId, quantity: 1 });
      await getCart();
    } catch (error) {
      alert('Error adding to cart');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId) => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/cart/${cartItemId}`);
      await getCart();
    } catch (error) {
      alert('Error removing item');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
      return;
    }

    try {
      setLoading(true);
      const item = cart.items.find(item => item.id === cartItemId);
      if (item) {
        await axios.delete(`${API_BASE}/cart/${cartItemId}`);
        await axios.post(`${API_BASE}/cart`, { 
          productId: item.product_id, 
          quantity: newQuantity 
        });
        await getCart();
      }
    } catch (error) {
      alert('Error updating quantity');
    } finally {
      setLoading(false);
    }
  };

  const checkout = async (e) => {
    e.preventDefault();
    if (!customer.name || !customer.email) {
      alert('Please fill name and email');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/checkout`, {
        cartItems: cart.items,
        customerInfo: customer
      });
      setReceipt(response.data);
      setView('receipt');
      setCustomer({ name: '', email: '' });
      await getCart();
    } catch (error) {
      alert('Error during checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Vibe Commerce</h1>
        <nav>
          <button 
            className={view === 'products' ? 'active' : ''}
            onClick={() => setView('products')}
          >
            Products
          </button>
          <button 
            className={view === 'cart' ? 'active' : ''}
            onClick={() => setView('cart')}
          >
            Cart ({cart.itemCount})
          </button>
        </nav>
      </header>

      <main>
        {view === 'products' && (
          <div>
            <h2>Products</h2>
            <div className="products">
              {products.map(product => (
                <div key={product.id} className="product">
                  <img src={product.image} alt={product.name} />
                  <h3>{product.name}</h3>
                  <p>${product.price}</p>
                  <button 
                    onClick={() => addToCart(product.id)}
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'cart' && (
          <div className="cart-view">
            <h2>Cart</h2>
            {cart.items.length === 0 ? (
              <p>Cart is empty</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map(item => (
                    <div key={item.id} className="cart-item">
                      <img src={item.image} alt={item.name} />
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <p>${item.price}</p>
                      </div>
                      <div className="quantity-controls">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={loading}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={loading}
                        >
                          +
                        </button>
                      </div>
                      <div className="item-total">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                      <button 
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <h3>Total: ${cart.total.toFixed(2)}</h3>
                  <button className="checkout-btn" onClick={() => setView('checkout')}>
                    Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {view === 'checkout' && (
          <div>
            <h2>Checkout</h2>
            <form className="checkout-form" onSubmit={checkout}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({...customer, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({...customer, email: e.target.value})}
                  required
                />
              </div>
              <div className="order-summary">
                <h4>Order</h4>
                {cart.items.map(item => (
                  <div key={item.id} className="order-item">
                    <span>{item.name} x {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="order-total">
                  <strong>Total: ${cart.total.toFixed(2)}</strong>
                </div>
              </div>
              <div className="checkout-actions">
                <button type="button" className="back-btn" onClick={() => setView('cart')}>
                  Back
                </button>
                <button type="submit" className="place-order-btn" disabled={loading}>
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        )}

        {view === 'receipt' && receipt && (
          <div>
            <h2>Order Confirmed!</h2>
            <div className="receipt">
              <h3>Thank you!</h3>
              <p>Order ID: {receipt.orderId}</p>
              <p>Date: {new Date(receipt.timestamp).toLocaleString()}</p>
              
              <div className="receipt-section">
                <h4>Customer</h4>
                <p>Name: {receipt.customer.name}</p>
                <p>Email: {receipt.customer.email}</p>
              </div>

              <div className="receipt-section">
                <h4>Items</h4>
                {receipt.items.map(item => (
                  <div className="receipt-item" key={item.id}>
                    <span>{item.name} x {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-total">
                <strong>Total: ${receipt.total.toFixed(2)}</strong>
              </div>

              <button className="continue-btn" onClick={() => {
                setView('products');
                setReceipt(null);
              }}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;