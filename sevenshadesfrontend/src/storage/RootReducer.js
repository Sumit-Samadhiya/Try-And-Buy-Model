const loadPersistedBag = () => {
    try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('trial_bag') : null;
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
                Object.values(parsed).every(item => item && typeof item === 'object' && Number.isInteger(Number(item.id)))) {
                return parsed;
            }
            localStorage.removeItem('trial_bag');
        }
    } catch (e) {}
    return {};
};

const savePersistedBag = (bag) => {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem('trial_bag', JSON.stringify(bag));
        }
    } catch (e) {}
};

var initialState = {
    product: loadPersistedBag(),
    user: {}
};

export default function RootReducer(state = initialState, action) {
    var payload = action.payLoad || action.payload;
    switch(action.type) 
    {
        case "ADD_PRODUCT": {
            const nextProduct = { ...state.product, [payload[0]]: payload[1] };
            savePersistedBag(nextProduct);
            return {
                ...state,
                product: nextProduct
            };
        }

        case "DELETE_PRODUCT": {
            var newProducts = { ...state.product };
            delete newProducts[payload[0]];
            savePersistedBag(newProducts);
            return {
                ...state,
                product: newProducts
            };
        }

        case "CLEAR_BAG": {
            savePersistedBag({});
            return {
                ...state,
                product: {}
            };
        }

        case "ADD_USER":
            return {
                ...state,
                user: { [payload[0]]: payload[1] }
            };

        case "CLEAR_USER":
            return {
                ...state,
                user: {}
            };
        default:
            return state;
    }
}

