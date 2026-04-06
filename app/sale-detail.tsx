import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StockStore } from '@/store/StockStore';
import { CartItem, PaymentMethod, SaleRecord, SoldItem, Product } from '@/types';

export default function SaleDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saleId } = useLocalSearchParams<{ saleId: string }>();

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [taxRate, setTaxRate] = useState(0);
  const [showCustomTax, setShowCustomTax] = useState(false);
  const [customTaxInput, setCustomTaxInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (saleId) {
      loadSale(saleId);
    }
  }, [saleId]);

  const loadSale = async (id: string) => {
    const sales = await StockStore.getSalesHistory();
    const found = sales.find((s) => s.id === id);
    if (found) {
      setSale(found);
      setPaymentMethod(found.paymentMethod);
      const rate = found.taxRate ?? 0;
      setTaxRate(rate);
      setCustomTaxInput(rate > 0 ? String(rate) : '');
      setShowCustomTax(rate > 0);
      // Convert SoldItem to CartItem format for editing
      // Note: We don't have full product info here, so we'll load products separately
      const products = await StockStore.getProducts();
      setAvailableProducts(products);
      const cartItems: CartItem[] = found.items.map((item) => {
        const product = products.find((p) => p.id === item.id);
        return {
          id: item.id,
          name: item.name,
          price: item.price,
          image: product?.image || '',
          stock: product?.stock || 0,
          productType: product?.productType || 'item',
          quantity: item.quantity,
        };
      });
      setCartItems(cartItems);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const updateQuantity = async (productId: string, delta: number) => {
    const products = await StockStore.getProducts();
    const product = products.find((p) => p.id === productId);
    const isService = product?.productType === 'service';

    if (!product && !isService && delta > 0) return;

    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            // Skip stock check for services
            if (!isService && sale) {
              const originalItem = sale.items.find((s) => s.id === productId);
              const originalQty = originalItem ? originalItem.quantity : 0;
              const maxQty = (product?.stock || 0) + originalQty;
              if (newQty > maxQty) {
                Alert.alert('Out of Stock', `Only ${maxQty} available.`);
                return item;
              }
            }
            return { ...item, quantity: Math.max(0, newQty) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const addToSale = (product: Product) => {
    const isService = product.productType === 'service';
    // Skip stock check for services
    if (!isService && product.stock === 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock.`);
      return;
    }

    const existing = cartItems.find((c) => c.id === product.id);
    if (existing) {
      updateQuantity(product.id, 1);
      return;
    }

    setCartItems((prev) => [
      ...prev,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '',
        stock: product.stock,
        productType: product.productType,
        quantity: 1,
      },
    ]);
  };

  const handleSave = async () => {
    if (!saleId || cartItems.length === 0) return;

    setIsLoading(true);
    try {
      const updatedSale = await StockStore.updateSaleItems(saleId, cartItems, taxRate);
      if (updatedSale) {
        Alert.alert('Success', 'Sale updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to update sale.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong.');
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!saleId) return;
    Alert.alert(
      'Delete Sale',
      'Deleting this sale will restore stock. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await StockStore.deleteSale(saleId);
            if (success) {
              router.back();
            } else {
              Alert.alert('Error', 'Failed to delete sale.');
            }
          },
        },
      ]
    );
  };

  const handlePaymentUpdate = async (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (saleId) {
      await StockStore.updateSalePayment(saleId, method);
    }
  };

  if (!sale) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 48 }]}>
        <Text style={{ color: colors.secondary, fontSize: 16, textAlign: 'center' }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Banner */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.primaryContainer,
            paddingTop: 16,
            paddingBottom: 20,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Sale {sale.id}</Text>
            <Text style={styles.headerDate}>
              {sale.timestamp.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <MaterialIcons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentPadding, { paddingBottom: 120 }]}>
        {/* Add Items - Horizontal Scroll */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Add Items
          </Text>
          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: colors.surfaceContainer },
            ]}
          >
            <MaterialIcons name="search" size={20} color={colors.secondary} />
            <TextInput
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search products..."
              placeholderTextColor={colors.secondary}
              style={[styles.searchInput, { color: colors.onSurface }]}
            />
            {productSearch.length > 0 && (
              <TouchableOpacity onPress={() => setProductSearch('')}>
                <MaterialIcons name="close" size={20} color={colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
          {/* Horizontal Scroll Product Row */}
          {availableProducts.filter((p) => {
            const q = productSearch.toLowerCase();
            return p.name.toLowerCase().includes(q) || !productSearch;
          }).length === 0 ? (
            <Text style={{ color: colors.secondary, fontSize: 14, textAlign: 'center', paddingVertical: 20 }}>
              No products found
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollRow}
            >
              {availableProducts
                .filter((p) => {
                  const q = productSearch.toLowerCase();
                  return p.name.toLowerCase().includes(q) || !productSearch;
                })
                .map((product) => {
                  const isService = product.productType === 'service';
                  const outOfStock = !isService && product.stock === 0;
                  const inCart = cartItems.find((c) => c.id === product.id);
                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        styles.horizontalProductCard,
                        {
                          backgroundColor: colors.surfaceContainerLowest,
                          borderColor: `${colors.outline}10`,
                          opacity: outOfStock ? 0.5 : 1,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => !outOfStock && addToSale(product)}
                      disabled={outOfStock}
                    >
                      <View style={[styles.horizontalProductThumb, { backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }]}>
                        {product.image ? (
                          <Image
                            source={{ uri: product.image }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialIcons
                            name={isService ? "miscellaneous-services" : "image"}
                            size={32}
                            color={colors.outline}
                          />
                        )}
                        {!isService && outOfStock && (
                          <View style={[styles.outOfStockOverlay, { borderRadius: 12 }]}>
                            <Text style={styles.outOfStockText}>Out of Stock</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.horizontalProductName, { color: colors.onSurface }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={[styles.horizontalProductPrice, { color: colors.primary }]}>
                        MVR {product.price.toFixed(2)}
                      </Text>
                      <View style={styles.horizontalProductAction}>
                        {inCart ? (
                          <View style={[styles.horizontalInCartBadge, { backgroundColor: colors.primary }]}>
                            <MaterialIcons name="check" size={12} color="#fff" />
                            <Text style={styles.horizontalInCartText}>{inCart.quantity}</Text>
                          </View>
                        ) : (
                          <View style={[styles.addIconCircle, { backgroundColor: outOfStock ? colors.outline : colors.primary }]}>
                            <MaterialIcons name="add" size={18} color={outOfStock ? '#fff' : '#fff'} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          )}
        </View>

        {/* Editable Items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Edit Items
          </Text>
          {cartItems.map((item) => (
            <View
              key={item.id}
              style={[
                styles.editItem,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: `${colors.outline}10`,
                },
              ]}
            >
              {/* Left side: Image + Name + Qty */}
              <View style={styles.editItemLeft}>
                <View style={[styles.editItemImageContainer, { backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' }]}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons name="image" size={32} color={colors.outline} />
                  )}
                </View>
                <View style={styles.editItemInfo}>
                  <Text style={[styles.editItemName, { color: colors.onSurface }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={[styles.qtyBtn, { backgroundColor: colors.surfaceContainer }]}
                      onPress={() => updateQuantity(item.id, -1)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="remove" size={14} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.onSurface }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.qtyBtn, { backgroundColor: colors.surfaceContainer }]}
                      onPress={() => updateQuantity(item.id, 1)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="add" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Right side: Price */}
              <View style={styles.editItemRight}>
                <Text style={[styles.editItemTotal, { color: colors.primary }]}>
                  MVR {(item.price * item.quantity).toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.removeItemBtn}
                  onPress={() => removeItem(item.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={16} color={colors.tertiary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Payment Method
          </Text>
          <View style={styles.paymentRow}>
            {([
              { key: 'cash' as PaymentMethod, icon: 'payments' as const, label: 'Cash' },
              { key: 'transfer' as PaymentMethod, icon: 'account-balance' as const, label: 'Transfer' },
              { key: 'dharani' as PaymentMethod, icon: 'assignment-late' as const, label: 'Credit' },
            ]).map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.paymentBtn,
                  {
                    backgroundColor:
                      paymentMethod === method.key ? colors.primary : colors.surfaceContainer,
                  },
                ]}
                onPress={() => handlePaymentUpdate(method.key)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={method.icon}
                  size={20}
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

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.surfaceContainerLowest, borderColor: `${colors.outline}10` }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.onSurface }]}>MVR {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>Tax {taxRate > 0 ? `(${taxRate}%)` : ''}</Text>
            <Text style={[styles.summaryValue, { color: colors.onSurface }]}>MVR {tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: colors.onSurface }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>MVR {total.toFixed(2)}</Text>
          </View>
          {/* Tax Selector */}
          <View style={styles.taxSection}>
            <View style={styles.taxHeader}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Tax</Text>
              {taxRate > 0 && (
                <Text style={[styles.taxRateText, { color: colors.primary }]}>{taxRate}%</Text>
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
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surfaceContainerLowest,
            paddingBottom: insets.bottom + 16,
            borderTopColor: `${colors.outline}20`,
          },
        ]}
      >
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: `${colors.tertiary}15` }]}
            activeOpacity={0.7}
            onPress={handleDelete}
          >
            <MaterialIcons name="delete" size={18} color={colors.tertiary} />
            <Text style={[styles.footerBtnText, { color: colors.tertiary }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.5 : 1 }]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={isLoading}
          >
            <MaterialIcons name="check" size={18} color={colors.white} />
            <Text style={[styles.footerBtnText, { color: colors.white }]}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  editItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  editItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  editItemInfo: {
    flex: 1,
    gap: 6,
  },
  editItemImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  editItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  editItemTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  editItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  removeItemBtn: {
    padding: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  paymentBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  taxSection: { marginTop: 12 },
  taxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taxRateText: { fontSize: 14, fontWeight: '700' },
  taxRow: { flexDirection: 'row', gap: 8 },
  taxBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  taxBtnText: { fontSize: 14, fontWeight: '700' },
  customTaxContainer: { marginTop: 8 },
  customTaxInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  // Add Items Product Browser
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 16 },
  horizontalScrollRow: {
    gap: 12,
    paddingRight: 16,
  },
  horizontalProductCard: {
    width: 140,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  horizontalProductThumb: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  horizontalProductName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  horizontalProductPrice: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  horizontalProductAction: {
    marginTop: 8,
  },
  horizontalInCartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  horizontalInCartText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  addProductThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  addProductInfo: { flex: 1 },
  addProductName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  addProductPrice: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  addProductStock: {
    fontSize: 11,
    fontWeight: '500',
  },
  addProductAction: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  inCartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inCartBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
