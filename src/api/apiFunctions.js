import { supabase } from "./SupabaseClient";

/*======================
  Mappers
======================*/
const mapInventoryItem = (row) => ({
  id:        row.id,
  name:      row.name,
  category:  row.category,
  stock:     row.stock,
  unit:      row.unit,
  costPrice: row.cost_price,
  sellPrice: row.sell_price,
  expiry:    row.expiry,
  status:    row.status,
});

// profiles table → app staff shape
// NOTE: role in profiles = "admin" | "staff" (auth role)
//       jobTitle in profiles = "Baker" | "Cashier" etc (job)
//       employmentStatus = "Active" | "On Leave" | "Inactive"
const mapStaffMember = (row) => ({
  id:               row.id,           // uuid
  staffId:          row.staff_id,     // STF-001
  name:             row.full_name,
  email:            row.email,
  jobTitle:         row.job_title,
  shift:            row.shift,
  phone:            row.phone,
  startDate:        row.start_date,
  salary:           row.salary,
  status:           row.employment_status,  // Active / On Leave / Inactive
  role:             row.role,               // admin / staff
  accountStatus:    row.status,            // pending / active / rejected
  avatarUrl:        row.avatar_url,
});

/*======================
  Inventory API
======================*/
export const getInventory = async () => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("id", { ascending: true });

  if (error) { console.error("getInventory:", error.message); return []; }
  return data.map(mapInventoryItem);
};

export const generateId = async () => {
  const { data, error } = await supabase
    .from("inventory")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return "BKR-001";
  const lastNum = parseInt(data[0].id.replace("BKR-", ""), 10);
  const next = isNaN(lastNum) ? 1 : lastNum + 1;
  return `BKR-${String(next).padStart(3, "0")}`;
};

export const addInventory = async (item) => {
  const { data, error } = await supabase
    .from("inventory")
    .insert([{
      id:         item.id,
      name:       item.name,
      category:   item.category,
      stock:      item.stock,
      unit:       item.unit,
      cost_price: item.costPrice,
      sell_price: item.sellPrice,
      expiry:     item.expiry,
      status:     item.status,
    }])
    .select()
    .single();

  if (error) { console.error("addInventory:", error.message); throw error; }
  return mapInventoryItem(data);
};

export const updateInventory = async (id, updates) => {
  const db = {};
  if (updates.name      !== undefined) db.name       = updates.name;
  if (updates.category  !== undefined) db.category   = updates.category;
  if (updates.stock     !== undefined) db.stock      = updates.stock;
  if (updates.unit      !== undefined) db.unit       = updates.unit;
  if (updates.costPrice !== undefined) db.cost_price = updates.costPrice;
  if (updates.sellPrice !== undefined) db.sell_price = updates.sellPrice;
  if (updates.expiry    !== undefined) db.expiry     = updates.expiry;
  if (updates.status    !== undefined) db.status     = updates.status;
  db.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("inventory")
    .update(db)
    .eq("id", id)
    .select()
    .single();

  if (error) { console.error("updateInventory:", error.message); throw error; }
  return mapInventoryItem(data);
};

export const deleteInventory = async (id) => {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) { console.error("deleteInventory:", error.message); throw error; }
  return true;
};

/*======================
  Staff API
  (queries profiles table — no more staff table)
======================*/
export const getStaffList = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "active")          // only approved accounts
    .order("staff_id", { ascending: true });

  if (error) { console.error("getStaffList:", error.message); return []; }
  return data.map(mapStaffMember);
};

export const updateStaff = async (id, updates) => {
  // id here is the profile uuid
  const db = {};
  if (updates.name      !== undefined) db.full_name         = updates.name;
  if (updates.jobTitle  !== undefined) db.job_title         = updates.jobTitle;
  if (updates.shift     !== undefined) db.shift             = updates.shift;
  if (updates.phone     !== undefined) db.phone             = updates.phone;
  if (updates.startDate !== undefined) db.start_date        = updates.startDate;
  if (updates.status    !== undefined) db.employment_status = updates.status;
  if (updates.salary    !== undefined) db.salary            = updates.salary;
  db.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update(db)
    .eq("id", id)
    .select()
    .single();

  if (error) { console.error("updateStaff:", error.message); throw error; }
  return mapStaffMember(data);
};

// "Delete" a staff member = set their account to rejected so they can't login
// We don't hard delete because they're auth users
export const deactivateStaff = async (id) => {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) { console.error("deactivateStaff:", error.message); throw error; }
  return true;
};

/*======================
  Profile API
======================*/
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) { console.error("getProfile:", error.message); return null; }
  return data;
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) { console.error("updateProfile:", error.message); throw error; }
  return data;
};