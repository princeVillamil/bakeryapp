import { initialInventory } from "../data/inventoryLog";
import { initialStaff } from "../data/staffLog";

let inventory = [...initialInventory];
let staffList = [...initialStaff];



/*======================
Inventory API
======================*/
// Get inventory
export const getInventory = async () => {
  return inventory;
};
export const generateId = async () => {
  const next = inventory.length + 1;
  return `BKR-${String(next).padStart(3, "0")}`;
}
// Update existing item
export const updateInventory = async (id, updates) => {
  inventory = inventory.map(item =>
    item.id === id ? { ...item, ...updates } : item
  );

  return inventory.find(item => item.id === id);
};
// Add new item
export const addInventory = async (item) => {
  inventory = [...inventory, item];
  return item;
};

/*======================
Staff API
======================*/
export const getStaffList = async () =>{
  return staffList;
}