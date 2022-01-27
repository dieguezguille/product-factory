/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useContext, useEffect } from 'react';
import { AbiItem } from 'web3-utils';
import { useSnackbar } from 'notistack';

import ProductFactoryAbi from '../abis/ProductFactory.json';
import { IProduct } from '../interfaces/product.interface';
import { productFactoryContext } from '../components/providers/ProductFactoryProvider';
import { walletProviderContext } from '../components/providers/WalletProvider';

export type ProductFactoryHookReturnType = {
  getAllProducts: () => Promise<void>;
  createProduct: (name: string) => Promise<void>;
  delegateProduct: (productId: number, newOwner: string) => Promise<void>;
  getPendingDelegations: () => Promise<void>;
  acceptProduct: (productId: number) => Promise<void>;
};

const useProductFactory = (): ProductFactoryHookReturnType => {
  const { enqueueSnackbar } = useSnackbar();
  const { web3Provider, address } = useContext(walletProviderContext);
  const {
    contract,
    setContract,
    products,
    setProducts,
    productsSize,
    setProductsSize,
    setPendingDelegations,
  } = useContext(productFactoryContext);

  const loadContract = () => {
    if (web3Provider && !contract) {
      const loadedContract = new web3Provider.eth.Contract(
        ProductFactoryAbi as AbiItem[],
        process.env.REACT_APP_CONTRACT_ADDRESS,
      );
      setContract(loadedContract);
    }
  };

  const getProductsSize = async (): Promise<number | void> => {
    const result: number = await contract?.methods.size().call();
    setProductsSize(result);
    return result;
  };

  const getProductByIndex = async (
    index: number,
  ): Promise<IProduct | undefined> => {
    if (!contract) {
      enqueueSnackbar('ProductFactory contract not found', {
        variant: 'error',
      });
      return undefined;
    }
    const result = await contract?.methods.products(index).call();
    const newProduct: IProduct = { ...result, id: index };
    return newProduct;
  };

  const getAllProducts = async () => {
    enqueueSnackbar('Getting products...', { variant: 'info' });
    const size = await getProductsSize();
    const productPromises = [];
    for (let index = 0; index < size; index += 1) {
      productPromises.push(getProductByIndex(index));
    }
    const results = await Promise.all(productPromises);
    setProducts(results);
  };

  const getPendingDelegations = async () => {
    enqueueSnackbar('Getting pending delegations...', { variant: 'info' });
    await getAllProducts();
    const delegations = products.filter(
      (product) =>
        product?.status.toString() === '1' &&
        product.newOwner.toLowerCase() === address?.toLowerCase(),
    );
    setPendingDelegations(delegations);
  };

  const createProduct = async (name: string) => {
    enqueueSnackbar('Creating product...', { variant: 'info' });
    const result = await contract?.methods
      .createProduct(name)
      .send({ from: address });
    const receipt = result.events.NewProduct.returnValues;
    if (receipt) {
      enqueueSnackbar('Product created successfully', { variant: 'success' });
    }
  };

  const delegateProduct = async (productId: number, newOwner: string) => {
    enqueueSnackbar('Delegating product...', { variant: 'info' });
    const result = await contract?.methods
      .delegateProduct(productId, newOwner)
      .send({ from: address });
    const receipt = result.events.DelegateProduct.returnValues;
    if (receipt) {
      enqueueSnackbar('Product delegated successfully', { variant: 'success' });
    }
  };

  const acceptProduct = async (productId: number) => {
    enqueueSnackbar('Accepting product...', { variant: 'info' });
    const result = await contract?.methods
      .acceptProduct(productId)
      .send({ from: address });
    const receipt = result.events.AcceptProduct.returnValues;
    if (receipt) {
      enqueueSnackbar('Product accepted successfully', { variant: 'success' });
    }
  };

  useEffect(() => {
    if (web3Provider) {
      loadContract();
    }
  }, [web3Provider]);

  return {
    getAllProducts,
    createProduct,
    delegateProduct,
    getPendingDelegations,
    acceptProduct,
  };
};

export default useProductFactory;
