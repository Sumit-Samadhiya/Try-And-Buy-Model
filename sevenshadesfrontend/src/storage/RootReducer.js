var initialState={
    product:{},
    user:{}
}

export default function RootReducer(state=initialState,action){
    var payload = action.payLoad || action.payload
    switch(action.type) 
    {
        case "ADD_PRODUCT":
            return {
                ...state,
                product: { ...state.product, [payload[0]]: payload[1] }
            }

        case "DELETE_PRODUCT":
            var newProducts = { ...state.product }
            delete newProducts[payload[0]]
            return {
                ...state,
                product: newProducts
            }

        case "ADD_USER":
            return {
                ...state,
                user: { [payload[0]]: payload[1] }
            }

        case "CLEAR_USER":
            return {
                ...state,
                user: {}
            }
        default:
            return state
    }
}


