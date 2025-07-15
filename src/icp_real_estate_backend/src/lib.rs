use candid::{CandidType, Principal};
use ic_cdk::api::time;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;

// --------------------- Data Models ---------------------

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Property {
    pub id: u64,
    pub name: String,
    pub owner: Principal,
    pub price: u64,
    pub is_leased: bool,
    pub created_at: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Transaction {
    pub property_id: u64,
    pub property_name: String,
    pub price: u64,
    pub action: String, // "added", "bought", etc.
    pub actor: Principal,
    pub timestamp: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Inquiry {
    pub property_id: u64,
    pub from: Principal,
    pub message: String,
    pub timestamp: u64,
}

// --------------------- Storage ---------------------

thread_local! {
    static PROPERTIES: RefCell<Vec<Property>> = RefCell::new(Vec::new());
    static TRANSACTIONS: RefCell<Vec<Transaction>> = RefCell::new(Vec::new());
    static INQUIRIES: RefCell<Vec<Inquiry>> = RefCell::new(Vec::new());
    static NEXT_ID: RefCell<u64> = RefCell::new(1);
}

// --------------------- Helper ---------------------

fn next_id() -> u64 {
    NEXT_ID.with(|id| {
        let mut current = id.borrow_mut();
        let next = *current;
        *current += 1;
        next
    })
}

// --------------------- Queries ---------------------

#[ic_cdk::query]
pub fn get_properties() -> Vec<Property> {
    PROPERTIES.with(|props| props.borrow().clone())
}

#[ic_cdk::query]
pub fn get_transactions() -> Vec<Transaction> {
    TRANSACTIONS.with(|txs| txs.borrow().clone())
}

#[ic_cdk::query]
pub fn get_inquiries() -> Vec<Inquiry> {
    INQUIRIES.with(|inqs| inqs.borrow().clone())
}

// --------------------- Updates ---------------------

#[ic_cdk::update]
pub fn add_property(name: String, price: u64) {
    let caller = ic_cdk::caller();
    let timestamp = time();
    let id = next_id();

    let new_property = Property {
        id,
        name: name.clone(),
        owner: caller,
        price,
        is_leased: false,
        created_at: timestamp,
    };

    PROPERTIES.with(|props| props.borrow_mut().push(new_property.clone()));

    let tx = Transaction {
        property_id: new_property.id,
        property_name: new_property.name,
        price: new_property.price,
        action: "added".to_string(),
        actor: caller,
        timestamp,
    };

    TRANSACTIONS.with(|txs| txs.borrow_mut().push(tx));
}

#[ic_cdk::update]
pub fn buy_property(id: u64) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let timestamp = time();

    PROPERTIES.with(|props| {
        let mut props = props.borrow_mut();

        if let Some(prop) = props.iter_mut().find(|p| p.id == id) {
            if prop.owner == caller {
                return Err("You already own this property.".to_string());
            }

            // Transfer ownership
            prop.owner = caller;

            let tx = Transaction {
                property_id: prop.id,
                property_name: prop.name.clone(),
                price: prop.price,
                action: "bought".to_string(),
                actor: caller,
                timestamp,
            };

            TRANSACTIONS.with(|txs| txs.borrow_mut().push(tx));
            Ok("Purchase successful!".to_string())
        } else {
            Err("Property not found.".to_string())
        }
    })
}

#[ic_cdk::update]
pub fn send_inquiry(property_id: u64, message: String) {
    let sender = ic_cdk::caller();
    let timestamp = time();

    let inquiry = Inquiry {
        property_id,
        from: sender,
        message,
        timestamp,
    };

    INQUIRIES.with(|inqs| inqs.borrow_mut().push(inquiry));
}
