import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { StockStore } from "@/store/StockStore";
import { Product, ProductType } from "@/types";

type FilterType = "all" | "low";

function ProductForm({
  product,
  onSave,
  onCancel,
}: {
  product: Product | null;
  onSave: (data: {
    name: string;
    price: string;
    buyPrice: string;
    stock: string;
    image: string;
    productType: ProductType;
  }) => void;
  onCancel: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [buyPrice, setBuyPrice] = useState(
    product ? String(product.buyPrice ?? "") : "",
  );
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [image, setImage] = useState(product?.image ?? "");
  const [productType, setProductType] = useState<ProductType>(
    product?.productType ?? "item",
  );

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    const p = parseFloat(price);
    if (!p || p <= 0) {
      Alert.alert("Error", "Sell Price is required");
      return;
    }
    // Check for duplicate name at DB level (not just current page)
    const trimmedName = name.trim();
    const duplicateExists = await StockStore.productExists(trimmedName, product?.id);
    if (duplicateExists) {
      Alert.alert(
        "Error",
        `A product named "${trimmedName}" already exists`,
      );
      return;
    }
    onSave({ name: name.trim(), price, buyPrice, stock, image, productType });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission",
        "Please allow photo library access to pick an image",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View
      style={[
        styles.form,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: `${colors.primary}30`,
        },
      ]}
    >
      <Text style={[styles.formTitle, { color: colors.onSurface }]}>
        {product ? "Edit Item" : "Add Item"}
      </Text>

      {/* Product Type Selector */}
      <View style={styles.typeRow}>
        {[
          { key: "item" as ProductType, label: "Item", icon: "inventory-2" },
          {
            key: "service" as ProductType,
            label: "Service",
            icon: "miscellaneous-services",
          },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.typeChip,
              {
                backgroundColor:
                  productType === t.key
                    ? colors.primary
                    : colors.surfaceContainer,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => {
              setProductType(t.key);
              if (t.key === "service") setStock("0");
            }}
          >
            <MaterialIcons
              name={t.icon as any}
              size={14}
              color={productType === t.key ? colors.white : colors.secondary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: productType === t.key ? colors.white : colors.secondary,
              }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Image Picker */}
      <TouchableOpacity
        style={styles.imagePicker}
        activeOpacity={0.7}
        onPress={pickImage}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: colors.surfaceContainer },
            ]}
          >
            <MaterialIcons
              name="add-a-photo"
              size={32}
              color={colors.outline}
            />
            <Text
              style={[styles.imagePlaceholderText, { color: colors.secondary }]}
            >
              Pick Photo
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {image && (
        <TouchableOpacity
          onPress={() => setImage("")}
          style={styles.removeImageBtn}
        >
          <MaterialIcons name="close" size={14} color={colors.tertiary} />
          <Text style={[styles.removeImageText, { color: colors.tertiary }]}>
            Remove
          </Text>
        </TouchableOpacity>
      )}
      <Text style={[styles.inputLabel, { color: colors.secondary }]}>Name</Text>
      <TextInput
        placeholder="Name"
        placeholderTextColor={colors.outline}
        value={name}
        onChangeText={setName}
        style={[
          styles.formInput,
          { backgroundColor: colors.surfaceContainer, color: colors.onSurface },
        ]}
      />
      <Text style={[styles.inputLabel, { color: colors.secondary }]}>
        Sell Price
      </Text>
      <TextInput
        placeholder="Sell Price"
        placeholderTextColor={colors.outline}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        style={[
          styles.formInput,
          { backgroundColor: colors.surfaceContainer, color: colors.onSurface },
        ]}
      />
      <Text style={[styles.inputLabel, { color: colors.secondary }]}>
        Buy Price
      </Text>
      <TextInput
        placeholder="Buy Price"
        placeholderTextColor={colors.outline}
        value={buyPrice}
        onChangeText={setBuyPrice}
        keyboardType="decimal-pad"
        style={[
          styles.formInput,
          { backgroundColor: colors.surfaceContainer, color: colors.onSurface },
        ]}
      />
      {productType === "item" && (
        <>
          <Text style={[styles.inputLabel, { color: colors.secondary }]}>
            Stock
          </Text>
          <TextInput
            placeholder="Stock"
            placeholderTextColor={colors.outline}
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surfaceContainer,
                color: colors.onSurface,
              },
            ]}
          />
        </>
      )}
      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.formBtn, { backgroundColor: colors.outline }]}
          activeOpacity={0.7}
          onPress={onCancel}
        >
          <Text style={styles.formBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={handleSubmit}
        >
          <MaterialIcons name="check" size={18} color={colors.white} />
          <Text style={[styles.formBtnText, { color: colors.white }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function InventoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  // Add form (top sheet)
  const [showAddForm, setShowAddForm] = useState(false);
  // Expanded edit forms (inline)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadProducts = useCallback(
    async (reset = true) => {
      try {
        if (reset) {
          setCursor(undefined);
          setProducts([]);
          setHasMore(true);
        }

        const options: any = {
          limit: 50,
          searchQuery: searchQuery || undefined,
          lowStock: activeFilter === "low" || undefined,
        };

        if (!reset && cursor) {
          options.cursor = cursor;
        }

        const result = await StockStore.getPaginatedProducts(options);
        const count = await StockStore.getProductCount({
          searchQuery: searchQuery || undefined,
          lowStock: activeFilter === "low" || undefined,
        });
        setTotalCount(count);

        // Get low stock count from DB (not from paginated page)
        const lowStock = await StockStore.getLowStockCount(5);
        setLowStockCount(lowStock);

        if (reset) {
          setProducts(result.data);
        } else {
          setProducts((prev) => {
            // Deduplicate by ID to prevent duplicates from race conditions
            const map = new Map<string, Product>();
            prev.forEach((p) => map.set(p.id, p));
            result.data.forEach((p) => map.set(p.id, p));
            return Array.from(map.values());
          });
        }
        setCursor(result.cursor);
        setHasMore(result.hasNextPage);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    },
    [searchQuery, cursor, activeFilter],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadProducts(false);
    setLoadingMore(false);
  }, [hasMore, loadingMore, loadProducts]);

  useEffect(() => {
    loadProducts(true);
  }, []);

  // Reload when search query changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadProducts(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  }, [loadProducts]);

  const filters: { key: FilterType; label: string; icon?: string }[] = [
    { key: "all", label: "All" },
    { key: "low", label: "Low Stock", icon: "warning" },
  ];

  // Server-side filtering for low stock
  const filteredProducts = products; // Already filtered at DB level

  const totalSellValue = products.reduce(
    (sum, p) => sum + p.price * p.stock,
    0,
  );
  const totalBuyValue = products.reduce(
    (sum, p) => sum + (p.buyPrice ?? 0) * p.stock,
    0,
  );

  const handleAddProduct = async (data: {
    name: string;
    price: string;
    buyPrice: string;
    stock: string;
    image: string;
    productType: ProductType;
  }) => {
    const buyPrice = parseFloat(data.buyPrice) || 0;
    const stock =
      data.productType === "service" ? 0 : parseInt(data.stock) || 0;

    await StockStore.createProduct({
      id: `P-${Date.now()}`,
      name: data.name,
      price: parseFloat(data.price),
      buyPrice,
      stock,
      image: data.image || "",
      productType: data.productType,
    });

    // Stock is an asset — no expense created (COGS will be calculated on sale)
    setShowAddForm(false);
    await loadProducts();
  };

  const handleUpdateProduct = async (
    product: Product,
    data: {
      name: string;
      price: string;
      buyPrice: string;
      stock: string;
      image: string;
      productType: ProductType;
    },
  ) => {
    const buyPrice = parseFloat(data.buyPrice) || 0;
    const newStock =
      data.productType === "service" ? 0 : parseInt(data.stock) || 0;

    await StockStore.updateProduct({
      ...product,
      name: data.name,
      price: parseFloat(data.price),
      buyPrice,
      stock: newStock,
      image: data.image || product.image,
      productType: data.productType,
    });

    // No auto expense — COGS is calculated when items are sold
    setExpandedId(null);
    await loadProducts();
  };

  const deleteProduct = (product: Product) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Check if product has been sold
          const hasSales = await StockStore.productHasSales(product.id);
          if (hasSales) {
            Alert.alert(
              "Cannot Delete",
              `"${product.name}" has sales history. Delete the related sales first, or set stock to 0 instead.`
            );
            return;
          }
          await StockStore.deleteProduct(product.id);
          await loadProducts();
        },
      },
    ]);
  };

  const adjustStock = async (product: Product, delta: number) => {
    const newQty = product.stock + delta;
    if (newQty < 0) return;
    await StockStore.updateStock(product.id, delta);
    await loadProducts();
  };

  const renderHeaderComponent = () => (
    <View
      style={{
        // paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 16,
      }}
    >
      {/* Hero Section */}
      <View
        style={[styles.heroCard, { backgroundColor: colors.primaryContainer }]}
      >
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Inventory Value</Text>
            <Text style={styles.heroTitle}>Stock Overview</Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{products.length}</Text>
              <Text style={styles.heroStatLabel}>Items</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{lowStockCount}</Text>
              <Text style={styles.heroStatLabel}>Low Stock</Text>
            </View>
          </View>
        </View>
        <View style={styles.heroTotals}>
          <View style={styles.heroTotalItem}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Sell</Text>
              <Text style={styles.heroTotalValue}>
                MVR{" "}
                {totalSellValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { opacity: 0.6 }]}>Buy</Text>
              <Text
                style={[styles.heroTotalValue, { fontSize: 28, opacity: 0.7 }]}
              >
                MVR{" "}
                {totalBuyValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
            <Text style={styles.heroTotalLabel}>Total Inventory Value</Text>
          </View>
        </View>
        <View
          style={[
            styles.heroDecoration,
            { backgroundColor: "rgba(255,255,255,0.08)" },
          ]}
        />
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.heroActionBtn}
            activeOpacity={0.7}
            onPress={() => setShowSearch(!showSearch)}
          >
            <MaterialIcons
              name={showSearch ? "close" : "search"}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          {!showAddForm && (
            <TouchableOpacity
              style={[
                styles.heroActionBtn,
                { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.7}
              onPress={() => setShowAddForm(true)}
            >
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Add Product Form (top sheet) */}
      {showAddForm && (
        <View style={styles.topFormWrapper}>
          <ProductForm
            product={null}
            onSave={handleAddProduct}
            onCancel={() => setShowAddForm(false)}
          />
        </View>
      )}

      {/* Search */}
      {showSearch && (
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.surfaceContainer },
          ]}
        >
          <MaterialIcons name="search" size={20} color={colors.secondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products..."
            placeholderTextColor={colors.secondary}
            style={[styles.searchInput, { color: colors.onSurface }]}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={20} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            onPress={() => setActiveFilter(filter.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === filter.key
                    ? colors.primary
                    : colors.surfaceContainer,
              },
            ]}
            activeOpacity={0.8}
          >
            {filter.icon && (
              <MaterialIcons
                name={filter.icon as any}
                size={14}
                color={
                  activeFilter === filter.key ? colors.white : colors.tertiary
                }
              />
            )}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color:
                  activeFilter === filter.key ? colors.white : colors.secondary,
              }}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeaderComponent}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item: product }) => {
          const isLow = product.productType === "item" && product.stock <= 5;
          const isService = product.productType === "service";
          const isExpanded = expandedId === product.id;
          return (
            <View>
              <TouchableOpacity
                style={[
                  styles.productCard,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    borderColor: `${colors.outline}10`,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setExpandedId(isExpanded ? null : product.id)}
              >
                <View style={styles.productCardTop}>
                  <View
                    style={[
                      styles.productThumb,
                      { backgroundColor: colors.surfaceContainer },
                    ]}
                  >
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialIcons
                        name={isService ? "miscellaneous-services" : "image"}
                        size={32}
                        color={colors.outline}
                      />
                    )}
                    {isLow && (
                      <View
                        style={[
                          styles.lowBadge,
                          { backgroundColor: colors.tertiary },
                        ]}
                      >
                        <Text style={styles.lowBadgeText}>Low Stock</Text>
                      </View>
                    )}
                    {isService && (
                      <View
                        style={[
                          styles.lowBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.lowBadgeText}>Service</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text
                      style={[
                        styles.productCardName,
                        { color: colors.onSurface },
                      ]}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>
                    <View style={styles.priceSection}>
                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPriceLabel}>Sell</Text>
                        <Text style={styles.productCardPrice}>
                          MVR {product.price.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPriceLabel}>Buy</Text>
                        <Text
                          style={[
                            styles.productBuyPrice,
                            { color: colors.outline },
                          ]}
                        >
                          MVR {(product.buyPrice ?? 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.productCardBottom}>
                  {isService ? (
                    <View style={styles.serviceBadge}>
                      <MaterialIcons
                        name="miscellaneous-services"
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.serviceText, { color: colors.primary }]}
                      >
                        Service
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.stockControls}>
                      <TouchableOpacity
                        style={[
                          styles.stockBtn,
                          { backgroundColor: colors.surfaceContainer },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => adjustStock(product, -1)}
                      >
                        <MaterialIcons
                          name="remove"
                          size={16}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.productStock,
                          { color: isLow ? colors.tertiary : colors.primary },
                        ]}
                      >
                        {product.stock}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.stockBtn,
                          { backgroundColor: colors.surfaceContainer },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => adjustStock(product, 1)}
                      >
                        <MaterialIcons
                          name="add"
                          size={16}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() =>
                        setExpandedId(isExpanded ? null : product.id)
                      }
                      activeOpacity={0.6}
                    >
                      <MaterialIcons
                        name={isExpanded ? "expand-less" : "edit"}
                        size={20}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteProduct(product)}
                      activeOpacity={0.6}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={20}
                        color={colors.tertiary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Inline Edit Form */}
              {isExpanded && (
                <View style={styles.inlineFormWrapper}>
                  <ProductForm
                    product={product}
                    onSave={(data) => handleUpdateProduct(product, data)}
                    onCancel={() => setExpandedId(null)}
                  />
                </View>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="inventory-2"
                size={48}
                color={colors.outline}
              />
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                {totalCount === 0 ? "No items yet" : "No results"}
              </Text>
              {totalCount === 0 && (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => setShowAddForm(true)}
                >
                  {/*<MaterialIcons
                    name="add"
                    size={18}
                    color={colors.white}
                    style={styles.addBtnText}
                  />*/}
                  <Text style={styles.addBtnText}>Add Item</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadMoreText, { color: colors.secondary }]}>
                Loading more...
              </Text>
            </View>
          ) : null
        }
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    position: "relative",
    zIndex: 1,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroStats: { flexDirection: "row", gap: 16 },
  heroStat: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroStatValue: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  heroTotalValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroTotalLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  heroTotals: {
    marginTop: 16,
  },
  heroTotalItem: { gap: 8 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  priceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 4,
  },
  heroDecoration: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -40,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    position: "relative",
    zIndex: 1,
  },
  heroActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    paddingHorizontal: 20,
  },
  topFormWrapper: { borderRadius: 16 },
  inlineFormWrapper: {
    marginTop: -8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  form: { borderRadius: 16, padding: 16, borderWidth: 1.5, gap: 10 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  formInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  formRow: { flexDirection: "row" },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  formBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  formBtnText: { fontSize: 14, fontWeight: "700" },
  imagePicker: { marginBottom: 8 },
  imagePreview: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePlaceholderText: { fontSize: 14, fontWeight: "500" },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginBottom: 8,
  },
  removeImageText: { fontSize: 12, fontWeight: "600" },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  serviceBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  serviceText: { fontSize: 14, fontWeight: "600" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  filtersRow: { gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  productList: { gap: 8 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 16 },
  productCard: { borderRadius: 12, padding: 12, borderWidth: 1 },
  productCardTop: { flexDirection: "row", gap: 12, marginBottom: 10 },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  lowBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  productInfo: { flex: 1 },
  productCardName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
    marginTop: 2,
  },
  priceSection: { gap: 3, marginTop: 4 },
  productPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPriceLabel: { fontSize: 10, color: "#64748B", fontWeight: "500" },
  productCardPrice: { fontSize: 13, fontWeight: "700", color: "#0EA5E9" },
  productBuyPrice: { fontSize: 11, fontWeight: "600" },
  productCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  stockControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  stockBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  productStock: {
    fontSize: 20,
    fontWeight: "800",
    minWidth: 32,
    textAlign: "center",
  },
  cardActions: { flexDirection: "row", gap: 12 },
  loadMoreText: { fontSize: 14, marginTop: 8 },
});
