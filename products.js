// Products management functionality
let products = [];
let businesses = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const authResult = await checkAuth();
    if (!authResult.success) {
        window.location.href = '/';
        return;
    }

    // Load initial data
    await Promise.all([
        loadProducts(),
        loadBusinesses(),
        loadProductStats()
    ]);
});

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch('/api/products', {
            credentials: 'include'
        });

        const result = await response.json();
        
        if (result.success) {
            products = result.data;
            renderProducts();
        } else {
            showError('Failed to load products: ' + result.error);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products');
    }
}

// Load businesses for dropdown
async function loadBusinesses() {
    try {
        const response = await fetch('/api/businesses', {
            credentials: 'include'
        });

        const result = await response.json();
        
        if (result.success) {
            businesses = result.data;
            populateBusinessSelect();
        } else {
            console.error('Failed to load businesses:', result.error);
        }
    } catch (error) {
        console.error('Error loading businesses:', error);
    }
}

// Load product statistics
async function loadProductStats() {
    try {
        const response = await fetch('/api/products/stats', {
            credentials: 'include'
        });

        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalProducts').textContent = result.data.total;
            document.getElementById('activeProducts').textContent = result.data.active;
            document.getElementById('inactiveProducts').textContent = result.data.inactive;
        }
    } catch (error) {
        console.error('Error loading product stats:', error);
    }
}

// Populate business select dropdown
function populateBusinessSelect() {
    const select = document.getElementById('businessSelect');
    select.innerHTML = '<option value="">Select a business...</option>';
    
    businesses.forEach(business => {
        const option = document.createElement('option');
        option.value = business._id;
        option.textContent = business.name;
        select.appendChild(option);
    });
}

// Render products grid
function renderProducts() {
    const container = document.getElementById('productsContainer');
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No products found</h3>
                <p>Start by adding your first product to the system.</p>
            </div>
        `;
        return;
    }

    const productsHTML = products.map(product => `
        <div class="product-card">
            ${product.imageUrl ? 
                `<img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div class="product-image" style="display:none;">No Image</div>` : 
                `<div class="product-image">No Image</div>`
            }
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div class="product-description">${escapeHtml(product.description)}</div>
            ${product.price > 0 ? `<div class="product-price">$${product.price.toFixed(2)}</div>` : ''}
            ${product.category ? `<div class="product-category">${escapeHtml(product.category)}</div>` : ''}
            <div class="product-business">Business: ${escapeHtml(product.businessName || 'Unknown')}</div>
            <div class="product-meta">
                <small>Added: ${new Date(product.createdAt).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="product-grid">${productsHTML}</div>`;
}

// Search products
async function searchProducts() {
    const query = document.getElementById('searchProducts').value.trim();
    
    try {
        const url = query ? `/api/products?query=${encodeURIComponent(query)}` : '/api/products';
        const response = await fetch(url, {
            credentials: 'include'
        });

        const result = await response.json();
        
        if (result.success) {
            products = result.data;
            renderProducts();
        } else {
            showError('Search failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error searching products:', error);
        showError('Search failed');
    }
}

// Refresh products
async function refreshProducts() {
    await Promise.all([
        loadProducts(),
        loadProductStats()
    ]);
    showSuccess('Products refreshed successfully');
}

// Modal functions
function openAddProductModal() {
    if (businesses.length === 0) {
        showError('Please add at least one business before creating products');
        return;
    }
    document.getElementById('addProductModal').style.display = 'block';
}

function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
    document.getElementById('addProductForm').reset();
}

// Add product form submission
document.getElementById('addProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        businessId: document.getElementById('businessSelect').value,
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        category: document.getElementById('productCategory').value.trim(),
        imageUrl: document.getElementById('productImage').value.trim(),
        webhookUrl: document.getElementById('webhookUrl').value.trim()
    };

    if (!formData.businessId || !formData.name || !formData.description) {
        showError('Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            showSuccess('Product added successfully!');
            closeAddProductModal();
            await Promise.all([
                loadProducts(),
                loadProductStats()
            ]);
        } else {
            showError('Failed to add product: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showError('Failed to add product');
    }
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('addProductModal');
    if (event.target === modal) {
        closeAddProductModal();
    }
});

// Search on Enter key
document.getElementById('searchProducts').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchProducts();
    }
});

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    // Simple error display - you can enhance this with a proper notification system
    alert('Error: ' + message);
}

function showSuccess(message) {
    // Simple success display - you can enhance this with a proper notification system
    alert('Success: ' + message);
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.location.href = '/';
        } else {
            showError('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed');
    }
}
