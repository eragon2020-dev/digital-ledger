import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StockStore } from '@/store/StockStore';
import { CartItem, PaymentMethod, SaleRecord, Product } from '@/types';

export default function NewSaleScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [taxRate, setTaxRate] = useState(0);
  const [showCustomTax, setShowCustomTax] = useState(false);
  const [customTaxInput, setCustomTaxInput] = useState('');
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchDebounced, setSearchDebounced] = useState(searchQuery);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load products with pagination
  const loadProducts = useCallback(async (reset = true) => {
    try {
      const options: any = {
        limit: 50,
        searchQuery: searchDebounced || undefined,
      };

      const result = await StockStore.getPaginatedProducts(options);
      
      if (reset) {
        setProducts(result.data);
      } else {
        setProducts((prev) => {
          const map = new Map<string, Product>();
          prev.forEach(p => map.set(p.id, p));
          result.data.forEach(p => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
      setHasMoreProducts(result.hasNextPage);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, [searchDebounced]);

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMoreProducts) return;
    setLoadingMore(true);
    await loadProducts(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reload products when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  // Server-side filtering already applied via searchDebounced
  // Filter for stock > 0 OR product_type is 'service'
  const filteredProducts = products.filter((p) => {
    const isService = p.productType === 'service';
    return p.stock > 0 || isService;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const isService = product.productType === 'service';

    // Skip stock check for services
    if (!isService) {
      const cartItem = cart.find((c) => c.id === productId);
      const currentQty = cartItem ? cartItem.quantity : 0;

      if (currentQty >= product.stock) {
        Alert.alert('Out of Stock', `${product.name} is out of stock.`);
        return;
      }
    }

    if (cart.find((c) => c.id === productId)) {
      setCart((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart((prev) => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const isService = product.productType === 'service';

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            // Skip stock check for services
            if (!isService && newQty > product.stock) {
              Alert.alert('Out of Stock', `Only ${product.stock} available.`);
              return item;
            }
            return { ...item, quantity: Math.max(0, newQty) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const processSale = async () => {
    if (cart.length === 0) return;

    setIsLoading(true);
    try {
      const sale = await StockStore.createSale(cart, paymentMethod, taxRate);
      if (sale) {
        setLastSale(sale);
        setShowReceipt(true);
        setCart([]);
        await loadProducts();
      } else {
        Alert.alert('Sale Failed', 'Not enough stock. Sale failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Sale error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ RECEIPT VIEW ============
  if (showReceipt && lastSale) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <MaterialIcons name="close" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <View
          style={[
            styles.receiptContainer,
            {
              backgroundColor: colors.surfaceContainerLowest,
              paddingTop: 24,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.receiptHeader}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <MaterialIcons name="check" size={36} color={colors.white} />
            </View>
            <Text style={[styles.receiptTitle, { color: colors.onSurface }]}>
              Back to Sales
            </Text>
            <Text style={[styles.receiptSubtitle, { color: colors.secondary }]}>
              {lastSale.id} •{' '}
              {lastSale.timestamp.toLocaleTimeString('dv-MV', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.receiptItems}>
            {lastSale.items.map((item, idx) => (
              <View key={idx} style={styles.receiptItemRow}>
                <Text
                  style={[styles.receiptItemName, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {item.name} x{item.quantity}
                </Text>
                <Text style={[styles.receiptItemTotal, { color: colors.onSurface }]}>
                  MVR {item.total.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.receiptSummary}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.secondary }]}>
                Subtotal
              </Text>
              <Text style={[styles.summaryValue, { color: colors.onSurface }]}>
                MVR {lastSale.subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.secondary }]}>
                Tax {lastSale.taxRate > 0 ? `(${lastSale.taxRate}%)` : ''}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.onSurface }]}>
                MVR {lastSale.tax.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: colors.onSurface }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                MVR {lastSale.total.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: `${colors.primary}10` }]}>
              <MaterialIcons
                name={
                  lastSale.paymentMethod === 'cash'
                    ? 'payments'
                    : lastSale.paymentMethod === 'transfer'
                    ? 'account-balance'
                    : 'credit-card'
                }
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.paymentBadgeText, { color: colors.primary }]}>
                {lastSale.paymentMethod === 'cash'
                  ? 'Cash'
                  : lastSale.paymentMethod === 'transfer'
                  ? 'Transfer'
                  : 'Credit'}
                {lastSale.taxRate > 0 ? ` • Tax ${lastSale.taxRate}%` : ''}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.newSaleButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.newSaleButtonText}>Back to Sales</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============ MAIN POS VIEW ============
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[styles.searchContainer, { backgroundColor: colors.surfaceContainer }]}
          >
            <MaterialIcons name="search" size={20} color={colors.secondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products..."
              placeholderTextColor={colors.secondary}
              style={[styles.searchInput, { color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* Product Grid - shows all loaded products */}
        {products.length === 0 ? (
          <View style={styles.loadingProducts}>
            <Text style={{ color: colors.secondary, fontSize: 14 }}>
              {searchQuery ? 'No products found' : 'Loading...'}
            </Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productGridRow}
            >
              {filteredProducts.slice(0, 6).map((product, idx) => {
                const inCart = cart.find((c) => c.id === product.id);
                const isService = product.productType === 'service';
                const outOfStock = !isService && product.stock === 0;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: colors.surfaceContainerLowest,
                        opacity: outOfStock ? 0.5 : 1,
                        borderWidth: inCart ? 2 : 1,
                        borderColor: inCart ? colors.primary : `${colors.outline}15`,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => !outOfStock && addToCart(product.id)}
                    disabled={outOfStock}
                  >
                    <View style={[styles.productImage, { backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }]}>
                      {product.image ? (
                        <Image source={{ uri: product.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <MaterialIcons name="image" size={40} color={colors.outline} />
                      )}
                      {!isService && outOfStock && (
                        <View style={styles.outOfStockOverlay}>
                          <Text style={styles.outOfStockText}>Out of Stock</Text>
                        </View>
                      )}
                      <View style={[styles.stockBadge, { backgroundColor: isService ? colors.primary : (outOfStock ? colors.tertiary : colors.primary) }]}>
                        <Text style={styles.stockBadgeText}>{isService ? '∞' : product.stock}</Text>
                      </View>
                    </View>
                    <Text style={[styles.productName, { color: colors.onSurface }]} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>MVR {product.price.toFixed(2)}</Text>
                    {inCart && (
                      <View style={[styles.inCartBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.inCartBadgeText}>{inCart.quantity} in cart</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productGridRow}
              style={{ marginTop: 10 }}
            >
              {filteredProducts.slice(6, 12).map((product) => {
                const inCart = cart.find((c) => c.id === product.id);
                const isService = product.productType === 'service';
                const outOfStock = !isService && product.stock === 0;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: colors.surfaceContainerLowest,
                        opacity: outOfStock ? 0.5 : 1,
                        borderWidth: inCart ? 2 : 1,
                        borderColor: inCart ? colors.primary : `${colors.outline}15`,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => !outOfStock && addToCart(product.id)}
                    disabled={outOfStock}
                  >
                    <View style={[styles.productImage, { backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }]}>
                      {product.image ? (
                        <Image source={{ uri: product.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <MaterialIcons name="image" size={40} color={colors.outline} />
                      )}
                      {!isService && outOfStock && (
                        <View style={styles.outOfStockOverlay}>
                          <Text style={styles.outOfStockText}>Out of Stock</Text>
                        </View>
                      )}
                      <View style={[styles.stockBadge, { backgroundColor: isService ? colors.primary : (outOfStock ? colors.tertiary : colors.primary) }]}>
                        <Text style={styles.stockBadgeText}>{isService ? '∞' : product.stock}</Text>
                      </View>
                    </View>
                    <Text style={[styles.productName, { color: colors.onSurface }]} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>MVR {product.price.toFixed(2)}</Text>
                    {inCart && (
                      <View style={[styles.inCartBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.inCartBadgeText}>{inCart.quantity} in cart</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Load More Button */}
        {hasMoreProducts && products.length > 12 && (
          <TouchableOpacity
              style={[styles.loadMoreBtn, { backgroundColor: colors.surfaceContainer }]}
              activeOpacity={0.7}
              onPress={loadMoreProducts}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Text style={[styles.loadMoreText, { color: colors.secondary }]}>Loading...</Text>
              ) : (
                <>
                  <MaterialIcons name="expand-more" size={20} color={colors.primary} />
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More Products</Text>
                </>
              )}
            </TouchableOpacity>
          )}

        {/* Cart Panel */}
        <View style={styles.cartSection}>
        {/* Cart Header */}
        <View style={styles.cartHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="shopping-cart" size={18} color={colors.primary} />
            <Text style={[styles.cartTitle, { color: colors.onSurface }]}>Cart</Text>
            {cart.length > 0 && (
              <View style={[styles.itemCountBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.itemCountText, { color: colors.primary }]}>
                  {totalItems}
                </Text>
              </View>
            )}
          </View>
          {cart.length > 0 && (
            <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
              <Text style={[styles.clearText, { color: colors.tertiary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cart Items - horizontal scroll */}
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <MaterialIcons name="shopping-cart" size={36} color={colors.outline} />
            <Text style={[styles.emptyCartText, { color: colors.outline }]}>
              Cart is empty
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cartItemsScroll}
          >
            {cart.map((item) => (
              <View
                key={item.id}
                style={[styles.cartItem, { backgroundColor: colors.surfaceContainer }]}
              >
                <TouchableOpacity
                  style={styles.cartItemRemove}
                  onPress={() => removeFromCart(item.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={14} color={colors.tertiary} />
                </TouchableOpacity>
                <View style={styles.cartItemImageContainer}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons name="image" size={24} color={colors.outline} />
                  )}
                </View>
                <Text
                  style={[styles.cartItemName, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {/* Quantity Controls */}
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                    onPress={() => updateQuantity(item.id, -1)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="remove" size={14} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.qtyText, { color: colors.onSurface }]}>
                    {item.quantity}
                  </Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                    onPress={() => updateQuantity(item.id, 1)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cartItemTotal, { color: colors.primary }]}>
                  MVR {(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Tax Selector */}
        <View style={styles.taxSection}>
          <View style={styles.taxHeader}>
            <Text style={[styles.taxLabel, { color: colors.secondary }]}>Tax</Text>
            {taxRate > 0 && (
              <Text style={[styles.taxRateText, { color: colors.primary }]}>
                {taxRate}%
              </Text>
            )}
          </View>
          <View style={styles.taxRow}>
            <TouchableOpacity
              style={[styles.taxBtn, { backgroundColor: taxRate === 0 ? colors.primary : colors.surfaceContainer }]}
              onPress={() => { setTaxRate(0); setShowCustomTax(false); setCustomTaxInput(''); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.taxBtnText, { color: taxRate === 0 ? colors.white : colors.secondary }]}>0%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.taxBtn, { backgroundColor: showCustomTax ? colors.primary : colors.surfaceContainer }]}
              onPress={() => setShowCustomTax(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={16} color={showCustomTax ? colors.white : colors.secondary} />
            </TouchableOpacity>
          </View>
          {showCustomTax && (
            <View style={styles.customTaxContainer}>
              <TextInput
                placeholder="Tax percentage"
                placeholderTextColor={colors.outline}
                value={customTaxInput}
                onChangeText={(text) => {
                  setCustomTaxInput(text);
                  const val = parseFloat(text);
                  if (!isNaN(val) && val >= 0 && val <= 100) {
                    setTaxRate(val);
                  }
                }}
                keyboardType="decimal-pad"
                style={[styles.customTaxInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface }]}
                autoFocus
              />
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentRow}>
            {([
              {
                key: 'cash' as PaymentMethod,
                icon: 'payments' as const,
                label: 'Cash',
                color: '#0EA5E9',
              },
              {
                key: 'transfer' as PaymentMethod,
                icon: 'account-balance' as const,
                label: 'Transfer',
                color: '#F43F5E',
              },
              { key: 'dharani' as PaymentMethod, icon: 'assignment-late' as const, label: 'Dharani', color: '#F59E0B' },
            ]).map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.paymentBtn,
                  {
                    backgroundColor:
                      paymentMethod === method.key ? method.color : colors.surfaceContainer,
                  },
                ]}
                onPress={() => setPaymentMethod(method.key)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={method.icon}
                  size={18}
                  color={paymentMethod === method.key ? colors.white : colors.secondary}
                />
                <Text
                  style={[
                    styles.paymentBtnText,
                    { color: paymentMethod === method.key ? colors.white : colors.secondary },
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Total & Checkout */}
        <View style={styles.checkoutSection}>
          <View style={styles.totalRow}>
            <Text style={[styles.checkoutTotalLabel, { color: colors.secondary }]}>Total</Text>
            <Text style={[styles.checkoutTotalValue, { color: colors.primary }]}>
              MVR {total.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              {
                backgroundColor: colors.primary,
                opacity: cart.length === 0 || isLoading ? 0.5 : 1,
              },
            ]}
            activeOpacity={0.8}
            onPress={processSale}
            disabled={cart.length === 0 || isLoading}
          >
            {isLoading ? (
              <Text style={styles.checkoutButtonText}>Processing...</Text>
            ) : (
              <>
                <Text style={styles.checkoutButtonText}>Complete Sale</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', right: 16, zIndex: 10, padding: 8 },
  // Receipt
  receiptContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  receiptHeader: { alignItems: 'center', marginBottom: 28 },
  receiptTitle: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  receiptSubtitle: { fontSize: 13 },
  receiptItems: { width: '100%', marginBottom: 20 },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  receiptItemName: { fontSize: 14, fontWeight: '600', flex: 1 },
  receiptItemTotal: { fontSize: 14, fontWeight: '700' },
  receiptSummary: { width: '100%', marginBottom: 28 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 26, fontWeight: '800' },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 92, 73, 0.1)',
  },
  paymentBadgeText: { fontSize: 13, fontWeight: '600' },
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    width: '100%',
  },
  newSaleButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  // Main POS
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  salesBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  salesBtnBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F43F5E',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesBtnBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  loadingProducts: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  productGrid: { gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  productGridRow: { flexDirection: 'row', gap: 10 },
  productCard: {
    width: 140,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  productImage: {
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  stockBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  productName: { fontSize: 12, fontWeight: '700', marginBottom: 3, textAlign: 'right' },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#0EA5E9', textAlign: 'right' },
  inCartBadge: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  inCartBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  // Cart Panel
  cartSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartTitle: { fontSize: 16, fontWeight: '800' },
  itemCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  itemCountText: { fontSize: 11, fontWeight: '700' },
  clearText: { fontSize: 13, fontWeight: '600' },
  emptyCart: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyCartText: { fontSize: 13 },
  cartItemsScroll: { gap: 10, paddingBottom: 10 },
  cartItem: {
    width: 110,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
  },
  cartItemRemove: { position: 'absolute', top: 6, right: 6, zIndex: 1 },
  cartItemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  cartItemName: { fontSize: 11, fontWeight: '600', marginBottom: 6, textAlign: 'right', width: '100%' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  qtyBtn: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 11, fontWeight: '700' },
  taxSection: { marginTop: 8, marginBottom: 12 },
  taxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taxLabel: { fontSize: 12, fontWeight: '600' },
  taxRateText: { fontSize: 14, fontWeight: '700' },
  taxRow: { flexDirection: 'row', gap: 8 },
  taxBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  taxBtnText: { fontSize: 14, fontWeight: '700' },
  customTaxContainer: { marginTop: 8 },
  customTaxInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  paymentSection: { marginTop: 6, marginBottom: 10 },
  paymentRow: { flexDirection: 'row', gap: 6 },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  paymentBtnText: { fontSize: 11, fontWeight: '600' },
  checkoutSection: { gap: 10 },
  checkoutTotalLabel: { fontSize: 16, fontWeight: '700' },
  checkoutTotalValue: { fontSize: 22, fontWeight: '800' },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  checkoutButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600' },
});
