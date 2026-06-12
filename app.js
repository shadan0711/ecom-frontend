const API_URL = 'https://ecom-backend-vmi8.onrender.com/api';
const SERVER_URL = 'https://ecom-backend-vmi8.onrender.com';

// DOM Element Selectors
const productContainer = document.getElementById('product-container');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const loginForm = document.getElementById('login-form');
const userLoggedIn = document.getElementById('user-logged-in');
const adminPanel = document.getElementById('admin-panel');

let storeProducts = [];
let cart = [];
let currentIsAdmin = false;
let editingProductId = null;

// --- 1. INITIALIZE SECURITY & SESSIONS ---
// --- 1. INITIALIZE SECURITY & SESSIONS ---
// --- 1. INITIALIZE SECURITY & SESSIONS WITH ROLE VALIDATION ---
// --- 1. INITIALIZE SECURITY & SESSIONS WITH DYNAMIC NAME RESOLUTION ---
function initAuth() {
    const token = localStorage.getItem('token');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const userDisplay = document.getElementById('user-display-name');

    if (token) {
        loginView.classList.add('hidden');
        registerView.classList.add('hidden');
        userLoggedIn.classList.remove('hidden');

        try {
            // Parse the middle section (payload) of the JWT string base64 data
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const tokenData = JSON.parse(window.atob(base64));

            // Extract the name from the token payload, fallback to generic roles if missing
            const accountName = tokenData.name || (tokenData.isAdmin ? "Admin" : "Customer");
            userDisplay.innerText = accountName;

            // Apply color coding based on admin privileges
            if (tokenData && tokenData.isAdmin === true) {
                currentIsAdmin = true;
                adminPanel.classList.remove('hidden');
                userDisplay.innerText = "Admin";
                userDisplay.style.color = "var(--accent-success)"; // Green for Admin


            } else {
                currentIsAdmin = false;
                adminPanel.classList.add('hidden');
                userDisplay.innerText = tokenData.name || "Customer";
                userDisplay.style.color = "var(--accent-primary)"; // Blue for Standard Users
            }
        } catch (error) {
            console.error("Token decoding failed:", error);
            logout(); // Boot out corrupted session states
        }

    } else {
        userLoggedIn.classList.add('hidden');
        adminPanel.classList.add('hidden');
        switchAuthMode('login');
    }
}

// --- NEW: INTERFACE TOGGLE UTILITY ---
function switchAuthMode(mode) {
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');

    if (mode === 'register') {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    } else {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    }
}

// --- 2. USER LOGIN ---
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('Please fill out all login fields.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed.');
        }

        localStorage.setItem('token', data.token);
        initAuth();
        await fetchCartFromBackend();
        alert('Successfully logged in.');
    } catch (error) {
        alert(`Login Error: ${error.message}`);
    }
}

// --- 3. USER LOGOUT ---
// --- 3. USER LOGOUT WITH SESSION ISOLATION ---
function logout() {
    // 1. Purge security tokens
    localStorage.removeItem('token');

    // 2. Clear out the persistent cart data from the local hard drive
    localStorage.removeItem('shopping_cart');

    // 3. Reset the active runtime memory array back to empty
    cart = [];

    // 4. Force a UI refresh to clear the header counts, summary text, and layout drawers
    updateCartUI();

    // 5. Re-evaluate auth states to display the Sign In screen again
    initAuth();

    alert('Logged out successfully. Cart session cleared.');
}

// --- NEW: USER REGISTRATION ENGINE ---
async function register() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    // Frontend validation guard rails
    if (!name || !email || !password) {
        alert('All registration fields are required.');
        return;
    }

    const registrationData = { name, email, password };

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed.');
        }

        alert('Account created successfully! You can now log in.');

        // Clear input blocks
        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';

        // Auto-route user back to the sign-in layout view
        switchAuthMode('login');

        // Pre-fill the login email for convenience
        document.getElementById('login-email').value = email;

    } catch (error) {
        alert(`Registration Error: ${error.message}`);
    }
}

// --- 4. FETCH INVENTORY FROM MONGODB ---
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Database connection failed.');
        storeProducts = await response.json();
        displayProducts(storeProducts);
    } catch (error) {
        productContainer.innerHTML = `<p style="color:var(--accent-danger);">Error: ${error.message}</p>`;
    }
}

// --- 5. RENDER CHIC UI CARDS ---
function displayProducts(products) {
    if (products.length === 0) {
        productContainer.innerHTML = '<p class="empty-text">No products found in store inventory.</p>';
        return;
    }

    productContainer.innerHTML = products.map(product => `
        <div class="product-card">
            ${product.imageUrl ? `<img src="${SERVER_URL}${product.imageUrl.replace('http://localhost:5001', '')}">` : ''}
            <div style="margin-top: 12px; margin-bottom: 16px;">
                <h3>${product.name}</h3>
                <div class="price">₹${product.price.toFixed(2)}</div>
            </div>
            <div class="card-actions" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
                    <button class="btn btn-primary" onclick="addToCart('${product._id}')">Add to Cart</button>
                    <button class="btn btn-secondary" onclick="viewProductDetails('${product._id}')">Details</button>
                </div>
                
                ${currentIsAdmin ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                        <button class="btn" style="background-color: #eab308; color: #0b0f19;" onclick="prepareEditForm('${product._id}')">Edit Item</button>
                        <button class="btn" style="background-color: var(--accent-danger); color: white;" onclick="deleteProduct('${product._id}')">Delete</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// --- 6. ADD TO CART STATE SYSTEM ---
function addToCart(productId) {
    const product = storeProducts.find(p => p._id === productId);
    const existingItem = cart.find(item => item.product === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            product: product._id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    localStorage.setItem('shopping_cart', JSON.stringify(cart));

    updateCartUI();
    syncCartToBackend();

    // UI Feedback: Fire custom toast notification
    showToast(`🛍️ ${product.name} added to your cart!`);
}

// --- 7. UPDATE SIDEBAR ELEMENT STATE ---
// --- 7. UPDATE SIDEBAR ELEMENT STATE (Upgraded with Interactive Quantity Modifiers) ---
function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCount.innerText = totalItems;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-text">Your cart is empty.</p>';
        cartTotal.innerText = '0.00';
        checkoutBtn.disabled = true;
        return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="changeQuantity('${item.product}', -1)">−</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity('${item.product}', 1)">+</button>
                </div>
                <button class="cart-remove-btn" onclick="removeFromCart('${item.product}')" title="Remove Item">✕</button>
            </div>
        </div>
    `).join('');

    const totalCost = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    cartTotal.innerText = totalCost.toFixed(2);
    checkoutBtn.disabled = false;
}

// --- 8. TOGGLE SIDEBAR VISIBILITY ---
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    // We toggle the active class to control the CSS sliding transition
    sidebar.classList.toggle('active');
}

// --- NEW: INCREMENT / DECREMENT QUANTITY ENGINE ---
function changeQuantity(productId, delta) {
    const item = cart.find(item => item.product === productId);
    if (!item) return;

    item.quantity += delta;

    // Logic Gate: If quantity drops to 0 or below, completely purge it from the array
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    // Save updated state array to permanent browser cache
    localStorage.setItem('shopping_cart', JSON.stringify(cart));
    updateCartUI();
    syncCartToBackend();
}

// --- NEW: COMPLETE CART ITEM REMOVAL ENGINE ---
function removeFromCart(productId) {
    // Filter out the selected product ID completely
    cart = cart.filter(item => item.product !== productId);

    // Sync changes to storage
    if (cart.length === 0) {
        localStorage.removeItem('shopping_cart');
    } else {
        localStorage.setItem('shopping_cart', JSON.stringify(cart));
    }

    updateCartUI();
    syncCartToBackend();
    showToast("🗑️ Item removed from your checkout cart.");
}

// --- NEW: TOAST NOTIFICATION GENERATOR ENGINE ---
function showToast(message) {
    const container = document.getElementById('toast-container');

    // Create element block dynamically
    const toast = document.createElement('div');
    toast.className = 'toast-alert';
    toast.innerText = message;

    container.appendChild(toast);

    // Step 1: Trigger auto-fade removal sequence after 2.5 seconds
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        // Step 2: Destroy the DOM element entirely after the exit animation completes
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2500);
}

// --- 9. SECURE BACKEND CHECKOUT ---
// --- 8. SECURE ORDER PROCESSING ENGINE ---
// Global State Storage Objects for Address Books
let userSavedProfileCache = null;
let useSavedAddressFlag = false;

// --- 8. SECURE CHECKOUT INITIALIZATION LAYER ---
async function checkoutOrder() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to process purchases.");
        switchAuthMode('login');
        return;
    }
    if (cart.length === 0) {
        alert("Your shopping cart drawer is empty.");
        return;
    }

    try {
        // Query database to check if the user has an existing address profile
        const response = await fetch(`${API_URL}/orders/check-profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        document.getElementById('checkout-modal').classList.remove('hidden');
        
        const addressEntrySection = document.getElementById('address-entry-fields');
        const addressSavedSection = document.getElementById('address-saved-fields');

        if (response.ok && data.hasSavedDetails) {
            // RETURNING USER: Cache data profile and alter view states
            userSavedProfileCache = data.addressBook;
            useSavedAddressFlag = true;

            addressEntrySection.classList.add('hidden');
            addressSavedSection.classList.remove('hidden');

            document.getElementById('saved-profile-summary-text').innerHTML = `
                <strong>House/Flat:</strong> ${data.addressBook.houseNo}<br>
                <strong>Landmark:</strong> ${data.addressBook.landmark || 'None'}<br>
                <strong>Address:</strong> ${data.addressBook.streetAddress}<br>
                <strong>Phone:</strong> +91 ${data.addressBook.phone}
            `;
            
            // Uncheck standard requirements since fields are hidden
            toggleInputRequirements(false);
        } else {
            // FIRST-TIME USER: Wipe cache and force form inputs
            resetSavedProfileView();
        }
    } catch (error) {
        console.error("Failed handling profile checks:", error);
        resetSavedProfileView();
    }
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.add('hidden');
}

function resetSavedProfileView() {
    useSavedAddressFlag = false;
    document.getElementById('address-entry-fields').classList.remove('hidden');
    document.getElementById('address-saved-fields').classList.add('hidden');
    toggleInputRequirements(true);
}

function toggleInputRequirements(isReq) {
    document.getElementById('chk-house').required = isReq;
    document.getElementById('chk-address').required = isReq;
    document.getElementById('chk-phone').required = isReq;
}

// --- 8B. EXECUTE FINAL ORDER PAYLOAD TRANSFERS ---
async function executeFinalOrder(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    
    let checkoutPayload = {};

    if (useSavedAddressFlag && userSavedProfileCache) {
        // Hydrate from backend storage cache values
        checkoutPayload = {
            houseNo: userSavedProfileCache.houseNo,
            landmark: userSavedProfileCache.landmark,
            streetAddress: userSavedProfileCache.streetAddress,
            phone: userSavedProfileCache.phone
        };
    } else {
        // Capture input values from form fields
        checkoutPayload = {
            houseNo: document.getElementById('chk-house').value.trim(),
            landmark: document.getElementById('chk-landmark').value.trim(),
            streetAddress: document.getElementById('chk-address').value.trim(),
            phone: document.getElementById('chk-phone').value.trim()
        };
    }

    const submitBtn = document.getElementById('final-checkout-submit-btn');
    submitBtn.innerText = "Transmitting Order...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/orders/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(checkoutPayload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Order dropped by database engine.");

        // Wipe frontend memory components on success
        cart = [];
        localStorage.removeItem('shopping_cart');
        updateCartUI();
        closeCheckoutModal();
        toggleCart();
        fetchProducts(); // Update inventory quantities listed in product catalog cells
        
        if (currentIsAdmin) fetchAdminOrders(); // Refresh order log dashboards automatically

        alert(`📦 COD Order Placed Successfully!\nYour Tracking ID: ${data.orderId}`);
    } catch (error) {
        alert(`Transaction Denied: ${error.message}`);
    } finally {
        submitBtn.innerText = "Confirm & Place COD Order";
        submitBtn.disabled = false;
    }
}

// --- 10. PRODUCT MODAL DETAILS VIEW ---
async function viewProductDetails(productId) {
    const modal = document.getElementById('details-modal');
    const modalData = document.getElementById('modal-product-data');

    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        if (!response.ok) throw new Error('Could not retrieve product specifics.');

        const product = await response.json();

        modalData.innerHTML = `
            <h2>${product.name}</h2>
            <p style="margin: 16px 0; color: var(--text-muted);">${product.description}</p>
            <p style="margin-bottom: 8px;"><strong>Price:</strong> ₹${product.price.toFixed(2)}</p>
            <p style="margin-bottom: 16px;"><strong>In Stock:</strong> ${product.stockQuantity} units</p>
            <span style="font-size: 11px; color: rgba(255,255,255,0.2);">SKU Reference: ${product._id}</span>
        `;

        modal.classList.remove('hidden');
    } catch (error) {
        alert(`Error loading details: ${error.message}`);
    }
}

function closeDetailsModal() {
    document.getElementById('details-modal').classList.add('hidden');
}

// --- 11. ADMIN Control System (Upgraded to handle dynamic file streams) ---
async function createNewProduct(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication error. Log in again.');
        return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('prod-name').value);
    formData.append('description', document.getElementById('prod-desc').value);
    formData.append('price', document.getElementById('prod-price').value);
    formData.append('stockQuantity', document.getElementById('prod-stock').value);

    const imageInput = document.getElementById('prod-image');
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    // Determine target URL and request type based on our editing state variable
    let targetUrl = `${API_URL}/products`;
    let methodType = 'POST';

    if (editingProductId) {
        targetUrl = `${API_URL}/products/${editingProductId}`;
        methodType = 'PUT'; // Reroute into target update endpoint path
    }

    try {
        const response = await fetch(targetUrl, {
            method: methodType,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to complete data transaction.');

        showToast(editingProductId ? "🔄 Product updated successfully!" : "🚀 Product published to system!");

        // Reset admin module state back to standard configuration mode
        editingProductId = null;
        const productForm = document.getElementById('add-product-form');
        if (productForm) productForm.reset();

        const adminHeading = document.querySelector('#admin-panel h2');
        if (adminHeading) {
            adminHeading.innerText = "Inventory Control";
        }

        const submitBtn = document.querySelector('#add-product-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerText = "Publish To Catalog";
            submitBtn.style.backgroundColor = "var(--accent-success)";
            submitBtn.style.color = "white";
        }

        fetchProducts(); // Refresh storefront layout values

    } catch (error) {
        alert(`Operation Failed: ${error.message}`);
    }
}


// Run full boot logic execution loop
bootApplication();

// --- 12. ADMIN: DELETE PRODUCT ENGINE ---
async function deleteProduct(productId) {
    if (!confirm("Are you absolutely sure you want to permanently delete this product?")) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Deletion sequence aborted.');

        showToast("🗑️ Item completely removed from database.");
        fetchProducts(); // Redraw layout
    } catch (error) {
        alert(`Deletion Failed: ${error.message}`);
    }
}

// --- 13. ADMIN: FILL FORM FIELDS FOR EDIT MODE ---
function prepareEditForm(productId) {
    const product = storeProducts.find(p => p._id === productId);
    if (!product) return;

    // Set state variables to track our current operation
    editingProductId = productId;

    // Direct data values into form entry positions
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-desc').value = product.description;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-stock').value = product.stockQuantity;

    // Alter text states on headers and buttons to show we are editing
    document.querySelector('#admin-panel h2').innerText = "Mode: Updating Existing Product";
    document.querySelector('#add-product-form button[type="submit"]').innerText = "Save Product Updates";
    document.querySelector('#add-product-form button[type="submit"]').style.backgroundColor = "#eab308";
    document.querySelector('#add-product-form button[type="submit"]').style.color = "#000";

    // Scroll smoothly to form box location for immediate focus
    document.getElementById('admin-panel').scrollIntoView({ behavior: 'smooth' });
}

// --- 15. BACKGROUND CLOUD CART SYNCHRONIZER ---
async function syncCartToBackend() {
    const token = localStorage.getItem('token');
    if (!token) return; // Fallback: Do nothing if the user is a public guest

    try {
        await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cart: cart.map(item => ({
                    product: item.product,
                    quantity: item.quantity
                }))
            })
        });
    } catch (error) {
        console.error("Background cart sync failed:", error);
    }
}

// --- 16. RECOVER CLOUD CART SESSION ON LOGIN ---
// --- 16. RECOVER CLOUD CART SESSION ON LOGIN (Robust Error Resistance) ---
async function fetchCartFromBackend() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status code: ${response.status}`);
        }
        
        const cloudCart = await response.json();
        if (cloudCart && cloudCart.length > 0) {
            cart = cloudCart;
            localStorage.setItem('shopping_cart', JSON.stringify(cart));
            updateCartUI();
        }
    } catch (error) {
        console.warn("Cloud cart recovery bypassed:", error.message);
        // Fallback: don't let a cart sync failure stall out the application interface
    }
}

// --- 14. PERSISTENT APPLICATION INITIALIZATION (Unconditional Processing) ---
async function bootApplication() {
    initAuth();
    
    // Step 1: Pre-load local layout storage cache immediately as a baseline
    const savedCart = localStorage.getItem('shopping_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            updateCartUI();
        } catch (error) {
            localStorage.removeItem('shopping_cart');
        }
    }
    
    // Step 2: If a profile token exists, attempt to pull backend cart values
    if (localStorage.getItem('token')) {
        await fetchCartFromBackend();
    }
    
    // Step 3: UNCONDITIONAL LIFECYCLE TARGET. Always load catalog data so UI never hangs!
    await fetchProducts();
}

// Fire system launch
bootApplication();


// --- 17. ADMIN: FETCH & RENDER GLOBAL ORDER FULFILLMENT QUEUE ---
async function fetchAdminOrders() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const queueContainer = document.getElementById('admin-orders-queue');

    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            // This forces the frontend to read the actual error sent by your Node.js server
            const errorData = await response.json();
            console.error("SERVER REJECTION:", errorData);
            throw new Error(`[BACKEND EXCEPTION] ${errorData.details || errorData.error || "Unknown Failure"}`);
        }

        const orders = await response.json();

        if (orders.length === 0) {
            queueContainer.innerHTML = '<p class="empty-text">No active customer orders found.</p>';
            return;
        }

        queueContainer.innerHTML = orders.map(order => `
            <div style="background-color: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 12px;">
                    <div>
                        <strong>Order ID:</strong> <span style="font-size: 12px; color: var(--text-muted);">${order._id}</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 12px; color: var(--text-muted);">Status:</span>
                        <select onchange="updateOrderStatus('${order._id}', this.value)" 
                                style="background: var(--bg-surface-hover); color: var(--text-primary); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: bold; cursor: pointer; outline: none;">
                            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                            <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 8px;">
                   <div style="margin-bottom: 8px;">
                    <strong>Customer:</strong> ${order.customerName || (order.user ? order.user.name : 'Unknown')} 
                    <span style="color: var(--accent-primary);">(${order.customerEmail || (order.user ? order.user.email : 'No Email')})</span>
                </div>
                </div>
                
                <div style="margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; border-left: 3px solid var(--accent-success);">
                    <strong>📦 Shipping Address:</strong> <span style="color: var(--text-primary);">${order.shippingAddress}</span>
                </div>

                <div style="margin-bottom: 8px;">
                    <strong>Items Purchased:</strong>
                    <ul style="margin-left: 20px; margin-top: 4px; color: var(--text-muted);">
                        ${order.items.map(item => `
                            <li>${item.name} (x${item.quantity}) - ₹${item.priceAtPurchase.toFixed(2)} each</li>
                        `).join('')}
                    </ul>
                </div>

                <div style="text-align: right; font-size: 16px; font-weight: bold; color: var(--accent-success);">
                    Total Paid: ₹${order.totalAmount.toFixed(2)}
                </div>
            </div>
        `).join('');

    } catch (error) {
        queueContainer.innerHTML = `<p style="color: var(--accent-danger);">Error tracking orders: ${error.message}</p>`;
    }
}

// --- 18. ADMIN: EXECUTE STATUS MUTATION PIPELINE ---
async function updateOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Server rejected the status update.");
        }

        // Silent success - re-fetch to ensure the UI is perfectly synced with the database
        fetchAdminOrders(); 
        
    } catch (error) {
        alert(`Status Update Failed: ${error.message}`);
        // If the server fails, re-fetch to revert the dropdown back to its true database state
        fetchAdminOrders(); 
    }
}



// --- 19. ADMIN UI: TAB SWITCHING ENGINE ---
function switchAdminTab(targetTab) {
    const invTab = document.getElementById('admin-tab-inventory');
    const ordTab = document.getElementById('admin-tab-orders');
    const btnInv = document.getElementById('tab-btn-inventory');
    const btnOrd = document.getElementById('tab-btn-orders');

    if (targetTab === 'inventory') {
        invTab.classList.remove('hidden');
        ordTab.classList.add('hidden');
        
        // Swap classes cleanly
        btnInv.className = "admin-tab-btn admin-tab-active";
        btnOrd.className = "admin-tab-btn admin-tab-inactive";
    } else if (targetTab === 'orders') {
        invTab.classList.add('hidden');
        ordTab.classList.remove('hidden');
        
        // Swap classes cleanly
        btnOrd.className = "admin-tab-btn admin-tab-active";
        btnInv.className = "admin-tab-btn admin-tab-inactive";
        
        fetchAdminOrders();
    }
}