import { supabase } from "../lib/supabase";

const toApp = (item) => ({
  id:        item.id,
  name:      item.name,
  category:  item.category,
  stock:     item.stock,
  unit:      item.unit,
  costPrice: item.cost_price,
  sellPrice: item.sell_price,
  expiry:    item.expiry,
  status:    item.status,
});

const toDB = (item) => ({
  id:         item.id,
  name:       item.name,
  category:   item.category,
  stock:      item.stock,
  unit:       item.unit,
  cost_price: item.costPrice,
  sell_price: item.sellPrice,
  expiry:     item.expiry,
  status:     item.status,
});

function deriveStatus(stock) {
  const s = parseInt(stock);
  if (isNaN(s) || s === 0) return "Out of Stock";
  if (s <= 5) return "Low Stock";
  return "In Stock";
}

/*======================
  Inventory API
======================*/

export const getInventory = async () => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data.map(toApp);
};

export const generateId = async () => {
  const { data, error } = await supabase
    .from("inventory")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return "BKR-001";
  const num = parseInt(data[0].id.replace("BKR-", "")) + 1;
  return `BKR-${String(num).padStart(3, "0")}`;
};

export const addInventory = async (item) => {
  const { data, error } = await supabase
    .from("inventory")
    .insert({ ...toDB(item), status: deriveStatus(item.stock) })
    .select()
    .single();
  if (error) throw error;
  return toApp(data);
};

export const updateInventory = async (id, updates) => {
  const { data, error } = await supabase
    .from("inventory")
    .update({
      name:       updates.name,
      category:   updates.category,
      stock:      updates.stock,
      unit:       updates.unit,
      cost_price: updates.costPrice,
      sell_price: updates.sellPrice,
      expiry:     updates.expiry,
      status:     deriveStatus(updates.stock),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toApp(data);
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
};

/*======================
  Staff API
======================*/

const formatProfile = (p) => ({
  id:        p.staff_id,
  uuid:      p.id,
  name:      p.name,
  email:     p.email,
  role:      p.role,
  shift:     p.shift,
  phone:     p.phone,
  startDate: p.start_date,
  status:    p.status,
  salary:    p.salary,
  isAdmin:   p.is_admin,
});

export const getStaffList = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .not("status", "in", '("Pending","Rejected")')
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(formatProfile);
};

export const getPendingStaff = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "Pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(formatProfile);
};

export const approveStaff = async (uuid) => {
  const { data, error } = await supabase
    .from("profiles").update({ status: "Active" }).eq("id", uuid).select().single();
  if (error) throw error;
  return formatProfile(data);
};

export const rejectStaff = async (uuid) => {
  const { data, error } = await supabase
    .from("profiles").update({ status: "Rejected" }).eq("id", uuid).select().single();
  if (error) throw error;
  return formatProfile(data);
};

export const updateStaff = async (uuid, updates) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      name:   updates.name,
      role:   updates.role,
      shift:  updates.shift,
      phone:  updates.phone,
      status: updates.status,
      salary: updates.salary,
    })
    .eq("id", uuid)
    .select()
    .single();
  if (error) throw error;
  return formatProfile(data);
};

export const deleteStaff = async (uuid) => {
  const { error } = await supabase.from("profiles").delete().eq("id", uuid);
  if (error) throw error;
};

/*======================
  Sales API
======================*/

const formatSale = (s) => ({
  id:    s.id,
  date:  s.date,
  note:  s.note ?? "",
  items: s.items ?? [],
});

export const getSales = async () => {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map(formatSale);
};

export const addSale = async (sale) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("sales")
    .insert({
      date:       sale.date,
      note:       sale.note ?? "",
      items:      sale.items,
      created_by: user?.id,
    })
    .select()
    .single();
  if (error) throw error;
  return formatSale(data);
};

export const deleteSale = async (id) => {
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw error;
};
